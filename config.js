/*
 * إعداد التطبيق — هاد الملف الوحيد اللي بتعدّله
 *
 * من Supabase: Project Settings ← API (أو Data API)
 *   SUPABASE_URL      : Project URL     (مثل https://abcdxyz.supabase.co)
 *   SUPABASE_ANON_KEY : anon / publishable key  (المفتاح العام — آمن بالمتصفح)
 *
 * ⚠️ أبداً ما تحط هون service_role / secret key. هداك المفتاح السري بيضل بس بالـ Edge Functions.
 */
window.TABOONI_CONFIG = {
  SUPABASE_URL: 'https://YOUR-PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'PUT_ANON_PUBLIC_KEY_HERE'
};
