window.ANYEN_CONFIG = {
  supabaseUrl: "https://tgaigagmkrkwnzcyfoir.supabase.co",
  publishableKey: "sb_publishable_JF5cb13wQjynjpN6tN1IeQ_m_NsV2k3"
};
// Supabase THỬ: chỉ dùng trên trang thử cheetahmsu.github.io (hoặc thêm ?supabase=test vào địa chỉ).
// anyen.space luôn dùng Supabase chính ở trên. Dự án thử: Langyen-chaythu.
window.ANYEN_TEST_CONFIG = {
  supabaseUrl: "https://cxytckciflwcmyrvgqyc.supabase.co",
  publishableKey: "sb_publishable_Gt8x_RJInzHJQM2Vsi8i_g_MiwvWp5b"
};
(function(){var t=window.ANYEN_TEST_CONFIG,q=/[?&]supabase=(test|main)/.exec(location.search),want=q?q[1]:(location.hostname==='cheetahmsu.github.io'?'test':'main');
  if(want==='test'&&t&&t.supabaseUrl&&t.publishableKey){window.ANYEN_CONFIG={supabaseUrl:t.supabaseUrl,publishableKey:t.publishableKey,isTest:true}}})();
