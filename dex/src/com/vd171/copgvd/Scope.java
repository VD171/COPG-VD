/*
 * ======================================================================
 *  COPG-VD  ::  global device spoofer
 *  Spoof your device fingerprint and build: Zygisk, KernelSU/APatch/Magisk.
 *
 *  Copyright (C) 2026  AlirezaParsi & VD171
 *  SPDX-License-Identifier: AGPL-3.0-or-later
 *  Fork by VD171.
 *
 *  Free software under the GNU AGPL v3 or later. NETWORK COPYLEFT: run a
 *  modified version, even as a service, and you MUST offer its source.
 *
 *  Site           : https://vd171.ru
 *  Site           : https://vd.priv8.ru
 *  Source         : https://github.com/VD171/COPG-VD
 *  GitHub         : @VD171 https://github.com/VD171
 *  XDA-Developers : @VD171 https://xdaforums.com/m/vd171.4699873/
 *  XDA thread     : https://xdaforums.com/t/COPG-VD.4807698/
 *  Telegram       : @VD_Priv8 https://t.me/VD_Priv8
 *  Channel        : @Priv8_VD https://t.me/Priv8_VD
 *  Discord        : @VD.Priv8 https://discord.com/users/1296831918989639721
 *  E-mail         : vd.priv8@pm.me
 * ======================================================================
 *
 *  Framework helper run as root via app_process (no installed app):
 *     LD_LIBRARY_PATH= app_process -Djava.class.path=copg_scope.dex /system/bin \
 *         com.vd171.copgvd.Scope list-scope [userId]
 *  Emits one JSON object: every selectable scope target on the device - the
 *  installed packages (with their real label) PLUS the static process names
 *  declared by every component (android:process), including the hidden ones
 *  like com.google.android.gms.unstable that dumpsys only shows while running.
 *  Talks to IPackageManager through ServiceManager (hidden APIs reached by
 *  reflection, so it compiles against the public android.jar) and never spins
 *  up ActivityThread/Looper, so it works where systemMain() hangs. The WebUI
 *  falls back to a pure-shell enumeration when this dex is absent, so the
 *  module is safe to ship with or without it.
 */
package com.vd171.copgvd;

import android.content.pm.ApplicationInfo;
import android.content.pm.ComponentInfo;
import android.content.pm.PackageInfo;
import android.content.res.AssetManager;
import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Path;
import android.graphics.RectF;
import android.graphics.drawable.Drawable;
import android.os.Build;
import android.os.IBinder;
import java.io.ByteArrayOutputStream;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.lang.reflect.Method;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import org.json.JSONObject;

public final class Scope {

    private static final int GET_ACTIVITIES = 0x00000001;
    private static final int GET_RECEIVERS  = 0x00000002;
    private static final int GET_SERVICES   = 0x00000004;
    private static final int GET_PROVIDERS  = 0x00000008;
    private static final int COMPONENT_FLAGS =
            GET_ACTIVITIES | GET_RECEIVERS | GET_SERVICES | GET_PROVIDERS;

    private static Object packageManager() throws Exception {
        Class<?> sm = Class.forName("android.os.ServiceManager");
        IBinder binder = (IBinder) sm.getMethod("getService", String.class).invoke(null, "package");
        if (binder == null) throw new IllegalStateException("package service unavailable");
        Class<?> stub = Class.forName("android.content.pm.IPackageManager$Stub");
        return stub.getMethod("asInterface", IBinder.class).invoke(null, binder);
    }

    // getInstalledPackages across the SDK generations: the flags arg is int on older
    // APIs and long on newer ones, so pick the overload by its parameter type.
    private static List<?> installedPackages(Object ipm, int flags, int userId) throws Exception {
        Method get = null;
        for (Method m : ipm.getClass().getMethods()) {
            if ("getInstalledPackages".equals(m.getName()) && m.getParameterTypes().length == 2) { get = m; break; }
        }
        if (get == null) throw new NoSuchMethodException("getInstalledPackages");
        Class<?>[] pt = get.getParameterTypes();
        Object flagsArg = (pt[0] == long.class) ? (Object) (long) flags : (Object) flags;
        Object slice = get.invoke(ipm, flagsArg, userId);
        if (slice == null) return java.util.Collections.emptyList();
        return (List<?>) slice.getClass().getMethod("getList").invoke(slice);
    }

    private static boolean selfProc(String proc, String pkg) {
        return proc.startsWith(pkg + ":") || proc.startsWith(pkg + ".");
    }

    // Collect each hidden process mapped to the package that DECLARED it (the owner, used for the
    // icon in the picker). When several packages declare the same global process name, a package the
    // process name belongs to (self-process) wins over an unrelated declarer.
    private static void collectProcs(ComponentInfo[] comps, String pkg, Map<String, String> procMap) {
        if (comps == null) return;
        for (ComponentInfo ci : comps) {
            if (ci == null) continue;
            String p = ci.processName;
            if (p == null || p.length() == 0) continue;
            // Resolve the shorthand forms to the name the OS actually assigns (the
            // nice_name the scope engine matches): android:process=":x" -> pkg:x, and
            // a leading dot -> pkg.x. Names without a prefix are already global/verbatim.
            char c0 = p.charAt(0);
            if (c0 == ':' || c0 == '.') p = pkg + p;
            // processName defaults to the package's main process; only the explicit
            // android:process children are the "hidden" targets worth listing apart.
            if (p.equals(pkg)) continue;
            String cur = procMap.get(p);
            if (cur == null || (selfProc(p, pkg) && !selfProc(p, cur))) procMap.put(p, pkg);
        }
    }

    private static void listScope(int userId) throws Exception {
        Object ipm = packageManager();
        List<?> pkgs;
        boolean withComponents = true;
        try {
            pkgs = installedPackages(ipm, COMPONENT_FLAGS, userId);
        } catch (Throwable big) {
            // ParceledListSlice streams large lists, but a device that still trips the
            // binder buffer with every component attached falls back to names only.
            pkgs = installedPackages(ipm, 0, userId);
            withComponents = false;
        }

        StringBuilder apps = new StringBuilder();
        Map<String, String> procMap = new TreeMap<String, String>();
        boolean first = true;
        for (Object o : pkgs) {
            PackageInfo pi = (PackageInfo) o;
            ApplicationInfo ai = pi.applicationInfo;
            String name = (ai != null && ai.packageName != null) ? ai.packageName : pi.packageName;
            if (name == null) continue;
            if (!first) apps.append(',');
            first = false;
            String label = (ai != null) ? labelOf(ai) : name;
            long vc = (Build.VERSION.SDK_INT >= 28) ? pi.getLongVersionCode() : (long) pi.versionCode;
            apps.append("{\"p\":\"").append(esc(name)).append("\",\"l\":\"").append(esc(label))
                .append("\",\"v\":").append(vc).append("}");
            if (withComponents) {
                collectProcs(pi.activities, name, procMap);
                collectProcs(pi.receivers, name, procMap);
                collectProcs(pi.services, name, procMap);
                collectProcs(pi.providers, name, procMap);
            }
        }

        StringBuilder sb = new StringBuilder("{\"ok\":true,\"source\":\"dex\",\"components\":")
                .append(withComponents).append(",\"packages\":[").append(apps).append("],\"processes\":[");
        boolean pf = true;
        for (Map.Entry<String, String> e : procMap.entrySet()) {
            if (!pf) sb.append(',');
            pf = false;
            sb.append("{\"n\":\"").append(esc(e.getKey())).append("\",\"p\":\"").append(esc(e.getValue())).append("\"}");
        }
        sb.append("]}");
        System.out.println(sb);
    }

    // ApplicationInfo via IPackageManager/ServiceManager (no Context, reflection so it still
    // compiles against public android.jar). Works where systemMain() hangs.
    private static ApplicationInfo appInfo(String pkg, int userId) throws Exception {
        Object ipm = packageManager();
        Method gai = null;
        for (Method m : ipm.getClass().getMethods()) {
            if ("getApplicationInfo".equals(m.getName()) && m.getParameterTypes().length == 3) { gai = m; break; }
        }
        if (gai == null) throw new NoSuchMethodException("getApplicationInfo");
        Class<?>[] pt = gai.getParameterTypes();
        Object flags = (pt[1] == long.class) ? (Object) 0L : (Object) 0;
        ApplicationInfo ai = (ApplicationInfo) gai.invoke(ipm, pkg, flags, userId);
        if (ai == null) throw new IllegalStateException("no ApplicationInfo for " + pkg);
        return ai;
    }

    // Render an app icon to a 144x144 rounded-square PNG, returned base64. Context-free (bare
    // AssetManager), so it never spins up ActivityThread. Returns null if there is no icon.
    private static String renderIconB64(String pkg, int userId) {
        try {
            ApplicationInfo ai = appInfo(pkg, userId);
            int resId = ai.icon;
            Resources res = apkResources(ai);
            if (resId == 0 || res == null) return null;
            Drawable d = res.getDrawable(resId, null);
            if (d == null) return null;
            int size = 144;
            Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bmp);
            float r = size * 0.22f;
            Path clip = new Path();
            clip.addRoundRect(new RectF(0, 0, size, size), r, r, Path.Direction.CW);
            canvas.clipPath(clip);
            boolean adaptive = false;
            if (Build.VERSION.SDK_INT >= 26) {
                try { adaptive = Class.forName("android.graphics.drawable.AdaptiveIconDrawable").isInstance(d); }
                catch (Throwable ignore) {}
            }
            if (adaptive) { int bleed = size / 6; d.setBounds(-bleed, -bleed, size + bleed, size + bleed); }
            else { d.setBounds(0, 0, size, size); }
            d.draw(canvas);
            ByteArrayOutputStream bos = new ByteArrayOutputStream();
            bmp.compress(Bitmap.CompressFormat.PNG, 100, bos);
            return Base64.getEncoder().encodeToString(bos.toByteArray());
        } catch (Throwable t) {
            return null;
        }
    }

    // icons <userId> <pkg...> -> {"ok":true,"icons":{"<pkg>":"<base64 png>",...}}. One JVM renders
    // many icons; a package that has no renderable icon is simply omitted from the map.
    private static void listIcons(int userId, String[] args, int from) {
        StringBuilder sb = new StringBuilder("{\"ok\":true,\"icons\":{");
        boolean first = true;
        for (int i = from; i < args.length; i++) {
            String pkg = args[i];
            if (pkg == null || pkg.length() == 0) continue;
            String b64 = renderIconB64(pkg, userId);
            if (b64 == null) continue;
            if (!first) sb.append(',');
            first = false;
            sb.append('"').append(esc(pkg)).append("\":\"").append(b64).append('"');
        }
        sb.append("}}");
        System.out.println(sb);
    }

    // APK resources through a bare AssetManager (no Context, so systemMain() never runs).
    private static Resources apkResources(ApplicationInfo ai) throws Exception {
        String apk = (ai.sourceDir != null) ? ai.sourceDir : ai.publicSourceDir;
        if (apk == null) return null;
        AssetManager am = AssetManager.class.getDeclaredConstructor().newInstance();
        AssetManager.class.getMethod("addAssetPath", String.class).invoke(am, apk);
        return new Resources(am, Resources.getSystem().getDisplayMetrics(),
                             Resources.getSystem().getConfiguration());
    }

    // The real app label: nonLocalizedLabel is null for most apps, so resolve the
    // localized labelRes from the APK's own resources (what getApplicationLabel does).
    private static String labelOf(ApplicationInfo ai) {
        CharSequence nl = ai.nonLocalizedLabel;
        if (nl != null) {
            String s = nl.toString().trim();
            if (!s.isEmpty()) return s;
        }
        if (ai.labelRes != 0) {
            try {
                Resources r = apkResources(ai);
                if (r != null) {
                    String s = r.getString(ai.labelRes);
                    if (s != null && !s.trim().isEmpty()) return s.trim();
                }
            } catch (Throwable ignore) {}
        }
        return ai.packageName;
    }

    private static String readFile(String path) throws Exception {
        FileInputStream f = new FileInputStream(path);
        try {
            ByteArrayOutputStream b = new ByteArrayOutputStream();
            byte[] buf = new byte[8192]; int n;
            while ((n = f.read(buf)) != -1) b.write(buf, 0, n);
            return new String(b.toByteArray(), "UTF-8");
        } finally { f.close(); }
    }

    private static void writeFile(String path, String s) throws Exception {
        FileOutputStream f = new FileOutputStream(path);
        try { f.write(s.getBytes("UTF-8")); } finally { f.close(); }
    }

    // Fingerprint-config merge via a real JSON parser (org.json), replacing the fragile awk field
    // merge in fingerprint-update.sh. Reads <in>, writes the merged result to <out> (a temp the shell
    // validates + commits). The new fingerprint values arrive as COPG_V_<FIELD> env vars (same contract
    // as the awk): COPG_V_SOURCE -> the top-level "Strings extracted from"; every other COPG_V_<X> ->
    // the module block's field X (replace if present, insert if new). Throws (writing nothing) if the
    // config does not parse or has no module block, so the shell falls back to the awk path.
    private static void mergeFp(String in, String moduleId, String out) throws Exception {
        JSONObject root = new JSONObject(readFile(in));
        JSONObject block = root.optJSONObject(moduleId);
        if (block == null) throw new IllegalStateException("no module block: " + moduleId);
        for (Map.Entry<String, String> e : System.getenv().entrySet()) {
            String k = e.getKey(), v = e.getValue();
            if (v == null || v.length() == 0 || !k.startsWith("COPG_V_")) continue;
            String field = k.substring(7);
            if ("SOURCE".equals(field)) root.put("Strings extracted from", v);
            else block.put(field, v);
        }
        writeFile(out, root.toString(2));
    }

    // Drop the given version fields from the module block (the version-semaphore path). Same temp-out
    // + fall-back-to-awk contract as mergeFp.
    private static void dropVer(String in, String moduleId, String out, String[] fields) throws Exception {
        JSONObject root = new JSONObject(readFile(in));
        JSONObject block = root.optJSONObject(moduleId);
        if (block == null) throw new IllegalStateException("no module block: " + moduleId);
        for (String f : fields) if (f != null && f.length() > 0) block.remove(f);
        writeFile(out, root.toString(2));
    }

    private static String esc(String s) {
        if (s == null) return "";
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            switch (c) {
                case '"': b.append("\\\""); break;
                case '\\': b.append("\\\\"); break;
                case '\n': b.append("\\n"); break;
                case '\r': b.append("\\r"); break;
                case '\t': b.append("\\t"); break;
                default: if (c < 0x20) b.append(String.format("\\u%04x", (int) c)); else b.append(c);
            }
        }
        return b.toString();
    }

    public static void main(String[] args) {
        try {
            String verb = (args.length > 0) ? args[0] : "";
            if ("list-scope".equals(verb)) {
                int userId = 0;
                if (args.length > 1) { try { userId = Integer.parseInt(args[1]); } catch (NumberFormatException ignore) {} }
                listScope(userId);
            } else if ("icons".equals(verb)) {
                // icons <userId> <pkg...>
                int userId = 0;
                if (args.length > 1) { try { userId = Integer.parseInt(args[1]); } catch (NumberFormatException ignore) {} }
                listIcons(userId, args, 2);
            } else if ("merge-fp".equals(verb)) {
                // merge-fp <in> <module_id> <out>   (new values from COPG_V_* env)
                mergeFp(args[1], args[2], args[3]);
                System.out.println("{\"ok\":true,\"verb\":\"merge-fp\"}");
            } else if ("drop-ver".equals(verb)) {
                // drop-ver <in> <module_id> <out> <field...>
                dropVer(args[1], args[2], args[3], java.util.Arrays.copyOfRange(args, 4, args.length));
                System.out.println("{\"ok\":true,\"verb\":\"drop-ver\"}");
            } else {
                System.out.println("{\"ok\":false,\"code\":\"ERR_VERB\"}");
            }
        } catch (Throwable t) {
            System.out.println("{\"ok\":false,\"code\":\"ERR_DEX\",\"message\":\"" + esc(t.toString()) + "\"}");
        }
        System.out.flush();
        System.exit(0);
    }
}
