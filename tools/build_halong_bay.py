#!/usr/bin/env python3
"""Sinh tệp dữ liệu dùng chung data/world-halong_bay.json cho cảnh Vịnh Hạ Long.

Toạ độ thật (vĩ độ, kinh độ) được chiếu phẳng quanh cảng Tuần Châu:
  x = Đông (+), z = Nam (+)  ·  1 đơn vị cảnh = METERS_PER_UNIT mét.
Các đảo đá phụ được rải ngẫu nhiên có hạt giống cố định trong vùng đảo đá vôi thật,
chừa trống các luồng tàu du lịch, nên mọi máy đều thấy cùng một vịnh.

Chạy lại sau khi sửa:  python3 tools/build_halong_bay.py
LƯU Ý (26/11): data/world-halong_bay.json đã được chỉnh tay sau lần sinh gần nhất (danh sách đảo đá, màu thuyền…);
chạy lại script sẽ ghi đè các chỉnh sửa đó. Muốn đổi một danh thắng thì sửa thẳng trong JSON (và ghi lại ở đây cho khớp).
"""
import json, math, random, os

LAT0, LON0 = 20.9250, 106.9950          # gần cảng tàu khách quốc tế Tuần Châu
METERS_PER_UNIT = 4.0
KX = 111320 * math.cos(math.radians(LAT0)) / METERS_PER_UNIT
KZ = 110574 / METERS_PER_UNIT

def xz(lat, lon):
    return round((lon - LON0) * KX, 1), round(-(lat - LAT0) * KZ, 1)

def poly(pts):
    return [list(xz(a, b)) for a, b in pts]

# ---- Danh thắng (precision: "source" = có nguồn toạ độ công bố, "approx" = ước lượng theo mô tả vị trí) ----
LANDMARKS = [
    # id, tên, lat, lon, hình dạng, bán kính, chiều cao, độ chính xác, ghi chú, mô tả
    ("cang_tuan_chau", "Cảng tàu khách quốc tế Tuần Châu", 20.9255, 106.9965, "pier", 0, 0, "approx",
     "Bến xuất phát của du thuyền, bờ đông nam đảo Tuần Châu", "Nơi các du thuyền rời bến vào vịnh"),
    ("dong_thien_cung", "Động Thiên Cung · Hang Đầu Gỗ", 20.9127, 107.0172, "big_island", 110, 62, "source",
     "showcaves.com: 20.9126814, 107.0172114 (bờ bắc đảo Đầu Gỗ)", "Hai hang đá nổi tiếng trên đảo Đầu Gỗ"),
    ("hon_cho_da", "Hòn Chó Đá", 20.9072, 107.0302, "dog", 16, 22, "approx",
     "Trên tuyến tham quan số 1, giữa Đầu Gỗ và Đỉnh Hương", "Hòn đá có dáng chú chó ngồi canh"),
    ("hon_dinh_huong", "Hòn Đỉnh Hương", 20.9088, 107.0418, "incense", 14, 26, "approx",
     "Gần Hòn Trống Mái, phía bắc", "Như một lư hương dâng lên trời"),
    ("hon_trong_mai", "Hòn Trống Mái", 20.9030, 107.0440, "pair", 24, 30, "approx",
     "Cách cảng Tuần Châu khoảng 5 km, phía nam Hòn Đỉnh Hương (Ban quản lý vịnh)", "Biểu tượng du lịch Hạ Long: đôi gà đá tựa vào nhau"),
    ("hon_con_coc", "Hòn Con Cóc", 20.8747, 107.131, "toad", 9, 18, "approx",
     "Cục Du lịch Quốc gia & Ban quản lý vịnh: cách cảng tàu du lịch Bãi Cháy 12 km về phía đông nam (cao khoảng 9 m)", "Khối đá nghiêng như chú cóc vươn mình ra biển"),
    ("lang_chai_ba_hang", "Làng chài Ba Hang", 20.8895, 107.0605, "village", 0, 0, "approx",
     "Khu Ba Hang, phía nam Trống Mái", "Những nhà bè nổi bình yên giữa vòng đá"),
    ("dao_ti_top", "Đảo Ti Tốp", 20.8589, 107.0809, "titop", 58, 28, "source",
     "Waymarking: N 20°51.528 E 107°04.858; khớp Wikipedia tiếng Pháp 20°51′32″N 107°04′49″E", "Bãi cát hình trăng lưỡi liềm, đỉnh ngắm toàn cảnh"),
    ("hang_sung_sot", "Hang Sửng Sốt · đảo Bồ Hòn", 20.8556, 107.0905, "big_island", 85, 70, "approx",
     "Trên đảo Bồ Hòn, đối diện Ti Tốp", "Hang lớn và đẹp bậc nhất vịnh Hạ Long"),
    ("hang_luon", "Hang Luồn", 20.8478, 107.0985, "arch", 52, 40, "approx",
     "Phía đông nam đảo Bồ Hòn", "Vòm đá dẫn vào hồ nước lặng giữa núi"),
    ("lang_chai_cua_van", "Làng chài Cửa Vạn", 20.8000, 107.1280, "village", 0, 0, "approx",
     "Khoảng 20 km từ đảo Tuần Châu, vùng Vạn Giã · Cửa Vạn", "Làng chài nổi lớn nhất vịnh Hạ Long"),
    # ---- Vịnh Lan Hạ (Hải Phòng): phía nam vịnh Hạ Long, phía đông đảo Cát Bà ----
    ("hang_sang_toi", "Hang Sáng Tối", 20.7900, 107.0790, "arch", 34, 30, "approx",
     "Phía bắc vịnh Lan Hạ, tuyến kayak quen thuộc", "Hang xuyên thủy, tối rồi bừng sáng ra hồ nước lặng"),
    ("ba_trai_dao", "Hòn Ba Trái Đào", 20.7680, 107.0860, "trio", 40, 26, "approx",
     "Giữa vịnh Lan Hạ", "Ba đỉnh đá tròn như ba trái đào, ôm bãi cát nhỏ"),
    ("dao_khi", "Đảo Khỉ · Cát Dứa", 20.7370, 107.0850, "beach", 44, 26, "approx",
     "Khoảng 10 phút đi thuyền từ bến Bèo, Cát Bà", "Bãi cát trắng và đàn khỉ sống tự do"),
    ("lang_chai_cai_beo", "Làng chài Cái Bèo", 20.7215, 107.0610, "village", 0, 0, "approx",
     "Khoảng 1,5 km phía đông nam thị trấn Cát Bà, gần bến Bèo", "Làng chài cổ nhất vịnh Lan Hạ, nhà bè san sát"),
    ("cau_bai_chay", "Cầu Bãi Cháy", 20.9560, 107.0712, "bridge", 0, 0, "approx",
     "Bắc qua eo Cửa Lục giữa Bãi Cháy và Hòn Gai", "Cây cầu dây văng nối hai bờ thành phố Hạ Long"),
    # ---- Bổ sung (bản đồ du lịch vịnh Hạ Long của vietnamtourism.com; hành trình vịnh Bái Tử Long, QĐ 2119/QĐ-UBND Quảng Ninh) ----
    ("nui_bai_tho", "Núi Bài Thơ", 20.9500, 107.0815, "mountain", 110, 100, "approx",
     "Trung tâm Hòn Gai, đường Lê Thánh Tông cạnh chợ Hạ Long, phía đông cầu Bãi Cháy; cao 168 m", "Núi đá vôi nhiều đỉnh, điểm ngắm toàn cảnh vịnh"),
    ("dong_me_cung", "Động Mê Cung", 20.8665, 107.0620, "big_island", 62, 48, "approx",
     "Đảo Lom Bò, gần Ti Tốp (tuyến 2)", "Hang nhiều ngách như mê cung, cửa hang nhìn ra vịnh"),
    ("dao_soi_sim", "Đảo Soi Sim", 20.8710, 107.0890, "beach", 40, 30, "approx",
     "Phía đông bắc Ti Tốp", "Bãi tắm nhỏ và đường mòn lên đỉnh ngắm toàn cảnh"),
    ("hang_thien_canh_son", "Hang Thiên Cảnh Sơn", 20.8800, 107.1400, "big_island", 70, 52, "approx",
     "Tuyến 4 (hang Cỏ · Thiên Cảnh Sơn), phía đông vịnh", "Hang cổ có dấu tích người Hạ Long, nhìn ra vịnh rộng"),
    ("lang_chai_vung_vieng", "Làng chài Vung Viêng", 20.8580, 107.1700, "village", 0, 0, "approx",
     "Tuyến 4, đi qua hang Cao vào áng nước kín", "Làng chài yên ả nhất vịnh, nhà bè nép chân vách đá"),
    ("dao_cong_do", "Đảo Cống Đỏ", 20.8600, 107.2350, "cove", 70, 58, "approx",
     "Tuyến 4, giáp vịnh Bái Tử Long", "Những áng nước kín giữa vách đá dựng, nước trong xanh"),
    ("dao_mat_rong", "Đảo Mắt Rồng · Hòn Bái Đông", 20.7983, 107.2293, "dragon_eye", 70, 44, "approx",
     "Báo Quảng Ninh (qua CafeF): rìa phía nam vịnh Hạ Long, giáp Bái Tử Long, khu Bái Đông – Ra Cát; cách Cảng tàu khách quốc tế Tuần Châu ~28 km và Cảng tàu khách quốc tế Hạ Long ~25 km (vị trí suy từ hai khoảng cách này)", "Hồ nước mặn tròn giữa lòng núi như con mắt rồng, vụng nông xanh ngọc"),
    ("ho_ba_ham", "Hồ Ba Hầm", 20.7880, 107.1050, "arch", 60, 45, "approx",
     "Giữa vịnh Hạ Long và Lan Hạ, vào hồ qua các vòm đá", "Ba hồ nước kín nối nhau bằng hang xuyên thủy"),
    ("cua_viet_hai", "Làng Việt Hải · cửa Việt Hải", 20.7930, 107.0450, "village", 0, 0, "approx",
     "Bờ đông đảo Cát Bà, trên tuyến 2 vịnh Lan Hạ", "Làng cổ trong thung lũng, bến thuyền ở cửa Việt Hải"),
    ("hon_rua", "Hòn Rùa", 20.7500, 107.0690, "dog", 14, 18, "approx",
     "Giữa Đảo Khỉ và cửa Việt Hải (tuyến 2 Lan Hạ)", "Hòn đá thấp dáng mai rùa nổi trên mặt nước"),
    ("bai_van_boi", "Bãi tắm Vạn Bội", 20.7640, 107.1120, "beach", 48, 34, "approx",
     "Phía đông vịnh Lan Hạ", "Bãi cát nhỏ nước trong, chỗ tắm vịnh và chèo kayak"),
    ("dao_nam_cat", "Đảo Nam Cát", 20.7430, 107.1060, "beach", 42, 28, "approx",
     "Phía đông nam vịnh Lan Hạ", "Bãi cát trắng nhỏ, nhà gỗ ven biển"),
    ("hon_dua", "Hòn Đũa (hòn Dù)", 20.9850, 107.3150, "incense", 9, 44, "approx",
     "Hành trình kết nối Hạ Long – Cẩm Phả, gần Cửa Ông", "Cột đá mảnh vươn thẳng như chiếc đũa giữa vịnh"),
    ("dao_thang_loi", "Đảo Thắng Lợi", 20.9180, 107.3850, "island_beach", 70, 48, "approx",
     "Hành trình kết nối Hạ Long – Vân Đồn", "Đảo nhỏ bãi cát dài, nước nông xanh"),
    ("dao_ngoc_vung", "Đảo Ngọc Vừng", 20.8950, 107.4300, "island_beach", 100, 62, "approx",
     "Vịnh Bái Tử Long, phía tây nam đảo Quan Lạn", "Bãi Ngọc Vừng cát trắng mịn, đảo đồi xanh"),
    ("bai_quan_lan", "Bãi biển Quan Lạn", 20.8800, 107.5450, "island_beach", 90, 50, "approx",
     "Đảo Quan Lạn: 20°53′N 107°30′E (Tạp chí Khoa học ĐHQGHN)", "Bãi cát trắng dài, rừng phi lao, làng cổ Quan Lạn"),
    ("bai_minh_chau", "Bãi biển Minh Châu", 20.9800, 107.6450, "island_beach", 90, 52, "approx",
     "Đầu đông bắc đảo Quan Lạn", "Bãi cát trắng mịn hướng ra biển khơi, rừng trâm cổ thụ"),
    ("dao_ban_sen", "Đảo Bản Sen · Hang Nhà Trò", 21.0020, 107.4650, "big_island", 70, 44, "approx",
     "Hành trình 1 vịnh Bái Tử Long (cảng Ao Tiên – Tây Hoi – hòn Mèo Lười – Bản Sen – hang Nhà Trò)", "Đảo Trà Bản yên bình, hang Nhà Trò bên mép nước"),
    ("hon_meo_luoi", "Hòn Mèo Lười", 21.0360, 107.4500, "dog", 16, 22, "approx",
     "Hành trình 1 vịnh Bái Tử Long, gần cảng Ao Tiên", "Hòn đá dáng chú mèo nằm lười phơi nắng"),
    ("vqg_bai_tu_long", "Vườn quốc gia Bái Tử Long · Ba Mùn", 21.0700, 107.6100, "big_island", 120, 60, "approx",
     "Wikipedia: vườn quốc gia ~21°06′N 107°38′E", "Rừng nguyên sinh trên đảo đá, hang Soi Nhụ"),
]
REGION = {"hang_sang_toi": "lanha", "ba_trai_dao": "lanha", "dao_khi": "lanha", "lang_chai_cai_beo": "lanha", "cua_viet_hai": "lanha",
          "hon_rua": "lanha", "bai_van_boi": "lanha", "dao_nam_cat": "lanha", "ho_ba_ham": "lanha",
          "hon_dua": "btl", "dao_thang_loi": "btl", "dao_ngoc_vung": "btl", "bai_quan_lan": "btl", "bai_minh_chau": "btl",
          "dao_ban_sen": "btl", "hon_meo_luoi": "btl", "vqg_bai_tu_long": "btl", "dao_cong_do": "btl"}
REGIONS = [{"id": "all", "name": "Toàn cảnh"}, {"id": "halong", "name": "Vịnh Hạ Long"}, {"id": "lanha", "name": "Vịnh Lan Hạ"}, {"id": "btl", "name": "Vịnh Bái Tử Long"}]

# ---- Bờ đất liền (Bãi Cháy · Hòn Gai) và đảo Tuần Châu (ước lượng) ----
MAINLAND_WEST = [(21.130, 106.930), (21.000, 106.930), (20.958, 106.935), (20.950, 106.958), (20.946, 106.976), (20.947, 106.992),
                 (20.951, 107.006), (20.948, 107.024), (20.951, 107.044), (20.955, 107.061), (20.958, 107.068),
                 (20.975, 107.068), (21.000, 107.060), (21.130, 107.060)]
MAINLAND_EAST = [(21.130, 107.080), (21.000, 107.080), (20.962, 107.076), (20.952, 107.082), (20.947, 107.098), (20.946, 107.118),
                 (20.949, 107.140), (20.958, 107.170), (20.966, 107.220), (20.978, 107.265), (20.995, 107.300),
                 (21.012, 107.335), (21.030, 107.355), (21.060, 107.365), (21.100, 107.362), (21.130, 107.360)]
# Bái Tử Long (ước lượng theo bản đồ du lịch): đảo Cái Bầu (Vân Đồn), đảo Quan Lạn chạy chéo đông bắc, đảo Trà Bản, đảo Ba Mùn
CAI_BAU = [(21.150, 107.385), (21.110, 107.392), (21.075, 107.398), (21.052, 107.412), (21.055, 107.432), (21.072, 107.442),
           (21.100, 107.452), (21.135, 107.462), (21.165, 107.452), (21.170, 107.400)]
QUAN_LAN = [(20.872, 107.478), (20.880, 107.500), (20.893, 107.522), (20.910, 107.545), (20.935, 107.572), (20.958, 107.598),
            (20.985, 107.622), (20.996, 107.630), (20.990, 107.640), (20.968, 107.622), (20.940, 107.592), (20.915, 107.565),
            (20.893, 107.540), (20.876, 107.515), (20.865, 107.490)]
TRA_BAN = [(21.018, 107.478), (21.035, 107.482), (21.046, 107.505), (21.040, 107.528), (21.022, 107.535), (21.008, 107.515), (21.006, 107.490)]
BA_MUN = [(21.095, 107.585), (21.112, 107.610), (21.130, 107.650), (21.125, 107.662), (21.105, 107.640), (21.088, 107.600)]
TUAN_CHAU = [(20.9372, 106.9725), (20.9385, 106.9845), (20.9370, 106.9955), (20.9318, 107.0010), (20.9262, 106.9998),
             (20.9238, 106.9905), (20.9262, 106.9790), (20.9300, 106.9730)]
# Đảo Cát Bà (ước lượng): bờ phía tây vịnh Lan Hạ
CAT_BA = [(20.865, 106.935), (20.845, 106.985), (20.815, 107.015), (20.790, 107.030), (20.765, 107.038), (20.740, 107.042),
          (20.728, 107.048), (20.716, 107.045), (20.705, 107.020), (20.700, 106.985), (20.712, 106.950), (20.750, 106.925),
          (20.800, 106.915), (20.840, 106.918)]
CAUSEWAY = [(20.9372, 106.9790), (20.9466, 106.9800), (20.9466, 106.9830), (20.9372, 106.9822)]

# ---- Vùng đảo đá vôi dày đặc (ước lượng theo bản đồ du lịch) ----
KARST_ZONES = [
    {"name": "Lõi di sản Hạ Long", "count": 640, "pts": [(20.921, 107.003), (20.918, 107.060), (20.905, 107.110), (20.880, 107.165),
                                                        (20.830, 107.175), (20.790, 107.150), (20.785, 107.100), (20.825, 107.045),
                                                        (20.862, 107.012), (20.895, 107.000)]},
    {"name": "Vịnh Lan Hạ", "count": 300, "pts": [(20.805, 107.050), (20.805, 107.130), (20.770, 107.150), (20.720, 107.130),
                                                (20.700, 107.090), (20.712, 107.062), (20.745, 107.052), (20.780, 107.048)]},
    {"name": "Phía tây nam Tuần Châu", "count": 130, "pts": [(20.912, 106.955), (20.913, 106.990), (20.880, 107.000), (20.845, 106.990), (20.850, 106.950)]},
    {"name": "Đông vịnh Hạ Long · Vung Viêng", "count": 220, "pts": [(20.905, 107.120), (20.915, 107.200), (20.900, 107.260), (20.840, 107.270), (20.820, 107.200), (20.835, 107.150)]},
    {"name": "Bái Tử Long tây", "count": 200, "weights": [6, 8, 26, 22, 14, 6, 4, 14],
     "pts": [(20.955, 107.270), (20.975, 107.330), (20.960, 107.400), (20.920, 107.420), (20.880, 107.360), (20.880, 107.290), (20.915, 107.265)]},
    {"name": "Bái Tử Long đông", "count": 160, "weights": [4, 8, 30, 24, 12, 4, 4, 14],
     "pts": [(21.040, 107.500), (21.060, 107.570), (21.050, 107.640), (21.010, 107.630), (20.990, 107.560), (20.960, 107.500), (20.985, 107.460)]},
]
# Lan Hạ: vách dựng đứng, đỉnh tròn phủ rừng (tháp + yên ngựa + hai đỉnh nhiều hơn)
KARST_ZONES[1]["weights"] = [24, 10, 8, 18, 18, 8, 6, 8]

# ---- Luồng tàu du lịch (giữ trống để du thuyền đi được) ----
CORRIDORS = [
    ["cang_tuan_chau", (20.918, 107.003), "dong_thien_cung", "hon_cho_da", "hon_dinh_huong", "hon_trong_mai",
     "lang_chai_ba_hang", (20.874, 107.070), "dao_ti_top", "hang_sung_sot", "hang_luon", (20.830, 107.108),
     (20.812, 107.120), "lang_chai_cua_van"],
    ["hon_trong_mai", (20.915, 107.055), (20.935, 107.062), "cau_bai_chay"],
    ["hang_luon", (20.818, 107.100), (20.800, 107.088), "hang_sang_toi", (20.778, 107.082), "ba_trai_dao", (20.752, 107.078), "dao_khi",
     (20.730, 107.072), "lang_chai_cai_beo"],
    ["cang_tuan_chau", (20.935, 107.012), (20.942, 107.035), (20.945, 107.055)],
    ["lang_chai_ba_hang", (20.875, 107.058), "dong_me_cung"],
    ["dao_ti_top", (20.868, 107.080), "dao_soi_sim", (20.878, 107.108), "hang_thien_canh_son", (20.868, 107.158), "lang_chai_vung_vieng",
     (20.872, 107.205), "dao_cong_do", (20.890, 107.280), (20.925, 107.300), "hon_dua"],
    [(20.890, 107.280), (20.905, 107.345), "dao_thang_loi", (20.912, 107.415), "dao_ngoc_vung", (20.895, 107.475), (20.868, 107.520),
     "bai_quan_lan", (20.905, 107.585), (20.945, 107.625), "bai_minh_chau", (21.020, 107.640), "vqg_bai_tu_long"],
    [(20.912, 107.415), (20.965, 107.440), "dao_ban_sen", (21.022, 107.452), "hon_meo_luoi"],
    ["lang_chai_cua_van", (20.792, 107.118), "ho_ba_ham", (20.778, 107.108), "bai_van_boi", (20.752, 107.100), "dao_nam_cat", (20.742, 107.088), "dao_khi"],
    ["hang_sang_toi", (20.795, 107.060), "cua_viet_hai"],
    ["dao_khi", (20.748, 107.075), "hon_rua"],
]
CORRIDOR_HALF_WIDTH = 105


# ---- Lịch trình tham quan (dựa theo các tuyến tham quan vịnh; dwell = số giây tàu dừng ngắm) ----
TOURS = [
    {"id": "tuyen_1", "name": "Tuyến 1 · Hang động và Hòn Trống Mái", "summary": "Chuyến ngắn quanh vùng vịnh gần bờ: hang Thiên Cung, Đầu Gỗ và các hòn đá biểu tượng.",
     "stops": [("dong_thien_cung", 18, "Hai hang đá nằm trên đảo Đầu Gỗ, gắn với truyền thuyết cọc gỗ trên sông Bạch Đằng."),
               ("hon_cho_da", 12, "Hòn đá như chú chó ngồi canh giữ vịnh."),
               ("hon_dinh_huong", 14, "Khối đá thắt chân, nở đỉnh như một lư hương dâng lên trời."),
               ("hon_trong_mai", 22, "Đôi gà đá tựa vào nhau, biểu tượng của du lịch Hạ Long."),
               ("cang_tuan_chau", 0, "Tàu về lại bến Tuần Châu.")]},
    {"id": "tuyen_2", "name": "Tuyến 2 · Ti Tốp, Sửng Sốt, Hang Luồn", "summary": "Đi sâu vào lõi di sản: bãi tắm Ti Tốp, hang Sửng Sốt và vòm Hang Luồn.",
     "stops": [("hon_trong_mai", 12, "Chào đôi gà đá trước khi vào sâu trong vịnh."),
               ("dao_ti_top", 22, "Bãi cát trăng lưỡi liềm; trên đỉnh đảo nhìn được toàn cảnh vịnh."),
               ("hang_sung_sot", 18, "Hang rộng và đẹp bậc nhất vịnh, trên đảo Bồ Hòn."),
               ("hang_luon", 18, "Vòm đá dẫn vào một hồ nước lặng giữa vòng núi."),
               ("cang_tuan_chau", 0, "Tàu về lại bến Tuần Châu.")]},
    {"id": "tron_vinh", "name": "Hành trình trọn vịnh · tới làng chài Cửa Vạn", "summary": "Đi một mạch từ bến qua các danh thắng tới làng chài nổi lớn nhất vịnh.",
     "stops": [("dong_thien_cung", 12, "Đảo Đầu Gỗ với hai hang đá nổi tiếng."),
               ("hon_trong_mai", 16, "Đôi gà đá giữa sóng nước."),
               ("lang_chai_ba_hang", 14, "Những nhà bè nổi bình yên giữa vòng đá."),
               ("dao_ti_top", 16, "Bãi cát trắng hình trăng lưỡi liềm."),
               ("hang_sung_sot", 12, "Đảo Bồ Hòn, nơi có hang Sửng Sốt."),
               ("hang_luon", 12, "Vòm đá Hang Luồn."),
               ("lang_chai_cua_van", 24, "Làng chài nổi lớn nhất vịnh Hạ Long, nép giữa núi đá Vạn Giã.")]},
    {"id": "lan_ha", "name": "Tuyến Lan Hạ · Hang Sáng Tối, Ba Trái Đào, Đảo Khỉ", "summary": "Xuôi về phía nam sang vịnh Lan Hạ (Hải Phòng), nước xanh ngọc, bãi cát nhỏ, kết thúc ở làng chài Cái Bèo.",
     "stops": [("hang_luon", 10, "Rời vùng Hang Luồn, tàu xuôi về phía nam sang vịnh Lan Hạ."),
               ("hang_sang_toi", 18, "Hang xuyên thủy: vào trong tối rồi bừng sáng ra một hồ nước lặng."),
               ("ba_trai_dao", 16, "Ba đỉnh đá tròn như ba trái đào bên bãi cát nhỏ."),
               ("dao_khi", 20, "Đảo Khỉ (Cát Dứa): bãi cát trắng, đàn khỉ sống tự do."),
               ("lang_chai_cai_beo", 22, "Làng chài Cái Bèo, làng chài cổ nhất vùng Cát Bà – Lan Hạ.")]},
    {"id": "tuyen_4", "name": "Tuyến 4 · Thiên Cảnh Sơn, Vung Viêng, Cống Đỏ", "summary": "Sang phía đông vịnh: hang cổ Thiên Cảnh Sơn, làng chài Vung Viêng yên ả, áng nước kín Cống Đỏ.",
     "stops": [("dao_ti_top", 10, "Rời Ti Tốp, tàu đi về phía đông."),
               ("dao_soi_sim", 14, "Đảo Soi Sim: bãi tắm nhỏ, đường mòn lên đỉnh."),
               ("hang_thien_canh_son", 18, "Hang Thiên Cảnh Sơn, nơi tìm thấy dấu tích người Hạ Long xưa."),
               ("lang_chai_vung_vieng", 22, "Làng chài Vung Viêng nép dưới vách đá, nhịp sống chậm."),
               ("dao_cong_do", 20, "Cống Đỏ: những áng nước kín giữa vách dựng, nước trong như gương.")]},
    {"id": "bai_tu_long", "name": "Vịnh Bái Tử Long · Ngọc Vừng, Quan Lạn, Minh Châu", "summary": "Hành trình dài sang vịnh Bái Tử Long (Vân Đồn): đảo đồi xanh, bãi cát trắng dài, vườn quốc gia.",
     "stops": [("dao_cong_do", 10, "Từ Cống Đỏ, tàu ra vùng nước rộng của Bái Tử Long."),
               ("hon_dua", 14, "Hòn Đũa vươn thẳng giữa vịnh."),
               ("dao_thang_loi", 14, "Đảo Thắng Lợi, bãi cát dài nước nông."),
               ("dao_ngoc_vung", 18, "Bãi Ngọc Vừng cát trắng mịn."),
               ("bai_quan_lan", 20, "Bãi biển Quan Lạn và làng cổ trên đảo."),
               ("bai_minh_chau", 20, "Bãi Minh Châu hướng ra biển khơi."),
               ("vqg_bai_tu_long", 18, "Vườn quốc gia Bái Tử Long, rừng nguyên sinh trên đảo đá.")]},
    {"id": "lan_ha_2", "name": "Lan Hạ tuyến 2 · Đảo Khỉ, Hòn Rùa, Việt Hải, Ba Trái Đào", "summary": "Theo tuyến 2 của vịnh Lan Hạ: Đảo Khỉ, hòn Rùa, cửa Việt Hải, bãi Ba Trái Đào, hang Sáng Tối.",
     "stops": [("lang_chai_cai_beo", 12, "Xuất phát từ làng chài Cái Bèo."),
               ("dao_khi", 16, "Đảo Khỉ (Cát Dứa)."),
               ("hon_rua", 12, "Hòn Rùa nổi trên mặt nước."),
               ("cua_viet_hai", 18, "Cửa Việt Hải, lối vào làng cổ Việt Hải trên đảo Cát Bà."),
               ("ba_trai_dao", 16, "Bãi Ba Trái Đào."),
               ("hang_sang_toi", 18, "Hang Sáng Tối, chèo kayak xuyên hang.")]},
    {"id": "lan_ha_bien", "name": "Lan Hạ · bãi tắm Vạn Bội, Nam Cát, Hồ Ba Hầm", "summary": "Các bãi cát nhỏ phía đông vịnh Lan Hạ và hồ nước kín Ba Hầm.",
     "stops": [("dao_khi", 10, "Rời Đảo Khỉ, đi về phía đông."),
               ("dao_nam_cat", 16, "Đảo Nam Cát, bãi cát trắng nhỏ."),
               ("bai_van_boi", 18, "Bãi tắm Vạn Bội, nước trong để tắm vịnh."),
               ("ho_ba_ham", 20, "Hồ Ba Hầm: ba hồ nước kín nối nhau qua hang xuyên thủy.")]},
]

def lm(i):
    return next(l for l in LANDMARKS if l[0] == i)

def corridor_pts(c):
    out = []
    for p in c:
        if isinstance(p, str):
            l = lm(p); out.append(xz(l[2], l[3]))
        else:
            out.append(xz(*p))
    return out

def seg_dist(px, pz, a, b):
    ax, az = a; bx, bz = b; vx, vz = bx - ax, bz - az
    L = vx * vx + vz * vz or 1
    t = max(0, min(1, ((px - ax) * vx + (pz - az) * vz) / L))
    return math.hypot(ax + vx * t - px, az + vz * t - pz)

def in_poly(x, z, P):
    inside = False
    for i in range(len(P)):
        x1, z1 = P[i]; x2, z2 = P[i - 1]
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1) + x1:
            inside = not inside
    return inside

def main():
    rnd = random.Random(20261119)
    corridors = [corridor_pts(c) for c in CORRIDORS]
    land = [poly(MAINLAND_WEST), poly(MAINLAND_EAST), poly(TUAN_CHAU), poly(CAUSEWAY), poly(CAT_BA), poly(CAI_BAU), poly(QUAN_LAN), poly(TRA_BAN), poly(BA_MUN)]

    landmark_rows = []
    for (i, name, lat, lon, shape, r, h, prec, src, desc) in LANDMARKS:
        x, z = xz(lat, lon)
        landmark_rows.append({"id": i, "name": name, "lat": lat, "lon": lon, "x": x, "z": z, "shape": shape,
                              "radius": r, "height": h, "precision": prec, "source": src, "description": desc, "region": REGION.get(i, "halong")})

    def near_corridor(x, z, pad):
        return any(seg_dist(x, z, c[k], c[k + 1]) < CORRIDOR_HALF_WIDTH + pad for c in corridors for k in range(len(c) - 1))

    karsts = []
    for zone in KARST_ZONES:
        P = poly(zone["pts"])
        xs = [p[0] for p in P]; zs = [p[1] for p in P]
        made, tries = 0, 0
        while made < zone["count"] and tries < zone["count"] * 60:
            tries += 1
            x = rnd.uniform(min(xs), max(xs)); z = rnd.uniform(min(zs), max(zs))
            if not in_poly(x, z, P):
                continue
            # Dáng núi: 0 tháp cao mảnh · 1 chóp nhọn · 2 đồi tròn · 3 dãy dài yên ngựa · 4 hai đỉnh
            #          5 nấm thắt chân · 6 răng nghiêng · 7 hòn nhỏ sát nước
            shape = rnd.choices(range(8), weights=zone.get("weights", [16, 16, 14, 10, 10, 8, 8, 18]))[0]
            r, h = {0: (rnd.uniform(9, 20), 0), 1: (rnd.uniform(18, 38), 0), 2: (rnd.uniform(24, 52), 0), 3: (rnd.uniform(26, 50), 0),
                    4: (rnd.uniform(20, 36), 0), 5: (rnd.uniform(13, 26), 0), 6: (rnd.uniform(9, 17), 0), 7: (rnd.uniform(4, 10), 0)}[shape]
            h = {0: r * rnd.uniform(3.2, 5.0), 1: r * rnd.uniform(2.0, 3.0), 2: r * rnd.uniform(.55, 1.0), 3: r * rnd.uniform(.9, 1.5),
                 4: r * rnd.uniform(1.6, 2.5), 5: r * rnd.uniform(1.7, 2.6), 6: r * rnd.uniform(2.6, 4.0), 7: r * rnd.uniform(1.0, 2.2)}[shape] + rnd.uniform(2, 12)
            er = r * (1.9 if shape == 3 else 1.0)          # bán kính hiệu dụng (dãy dài kéo dài 1,9 lần)
            if near_corridor(x, z, er):
                continue
            if any(in_poly(x, z, L) for L in land):
                continue
            if any(math.hypot(l["x"] - x, l["z"] - z) < (l["radius"] or 40) + er + 70 for l in landmark_rows):
                continue
            if any(math.hypot(k[0] - x, k[1] - z) < (k[2] * (1.9 if k[4] == 3 else 1) + er) * .9 for k in karsts):
                continue
            karsts.append([round(x, 1), round(z, 1), round(r, 1), round(h, 1), shape])
            made += 1

    # Chỉ giữ 333 đảo lớn nhất (mặt đứng nhìn từ tàu: bề ngang × chiều cao). Đảo check-in, danh thắng và đảo trên tour
    # là các danh thắng (props kind "landmark") dựng riêng nên luôn còn, không tính vào 333.
    KEEP_COUNT = 333
    size = lambda k: k[2] * (1.9 if k[4] == 3 else 1.35 if k[4] == 4 else 1) * k[3]
    keep = sorted(karsts, key=size, reverse=True)[:KEEP_COUNT]
    keep_ids = {id(k) for k in keep}
    karsts = [k for k in karsts if id(k) in keep_ids]

    # Điểm tàu ghé (trong luồng, cách danh thắng một khoảng an toàn)
    for l in landmark_rows:
        best = None
        for c in corridors:
            for k in range(len(c) - 1):
                (ax, az), (bx, bz) = c[k], c[k + 1]
                vx, vz = bx - ax, bz - az; L = vx * vx + vz * vz or 1
                t = max(0, min(1, ((l["x"] - ax) * vx + (l["z"] - az) * vz) / L))
                px, pz = ax + vx * t, az + vz * t
                d = math.hypot(px - l["x"], pz - l["z"])
                if best is None or d < best[0]:
                    best = (d, px, pz)
        d, px, pz = best
        want = (l["radius"] or 0) + 55
        if d < want:  # đẩy điểm ghé ra xa đảo
            if d < 1:
                px, pz = l["x"] + want, l["z"]
            else:
                px, pz = l["x"] + (px - l["x"]) / d * want, l["z"] + (pz - l["z"]) / d * want
        l["approach"] = [round(px, 1), round(pz, 1)]
    port = next(l for l in landmark_rows if l["id"] == "cang_tuan_chau")
    port["approach"] = [port["x"] + 40, port["z"] + 60]
    # Bến hang Sửng Sốt nằm ở phía đảo Bồ Hòn nhìn sang Ti Tốp (tàu ghé ở vùng nước giữa hai đảo)
    ss = next(l for l in landmark_rows if l["id"] == "hang_sung_sot"); tt = next(l for l in landmark_rows if l["id"] == "dao_ti_top")
    ang = math.atan2(tt["approach"][1] - ss["z"], tt["approach"][0] - ss["x"]) + 0.8; dd = ss["radius"] * 1.25 + 26 + 30
    ss["approach"] = [round(ss["x"] + math.cos(ang) * dd, 1), round(ss["z"] + math.sin(ang) * dd, 1)]
    bridge = next(l for l in landmark_rows if l["id"] == "cau_bai_chay")
    bridge["approach"] = [bridge["x"] - 20, bridge["z"] + 190]

    # Thuyền gỗ nhỏ chạy vòng trong vùng nước thóang; phao vịnh dọc luồng.
    junks, buoys = [], []
    # Không còn thuyền chạy vòng hay phao trên luồng (từng đi xuyên qua du thuyền).
    # Chỉ vài thuyền gỗ neo yên sát chân các đảo lớn, nằm trong vùng đảo nên tàu không bao giờ đi qua.
    for lid in ["dong_thien_cung", "dao_ti_top", "hang_sung_sot", "hang_luon", "hon_dinh_huong"]:
        l = next(x for x in landmark_rows if x["id"] == lid)
        ax, az = l["approach"]; ang = math.atan2(az - l["z"], ax - l["x"]) + 1.35
        d = (l["radius"] or 14) * 1.05 + 9
        junks.append({"id": f"thuyen_neo_{lid}", "kind": "moored_boat", "name": "Thuyền gỗ neo",
                      "x": round(l["x"] + math.cos(ang) * d, 1), "z": round(l["z"] + math.sin(ang) * d, 1),
                      "params": {"heading": round(ang + 1.57, 2), "hull": rnd.choice(["#7d5a3d", "#8a6446", "#6f4f36"])}, "activity": None})

    xs = [p[0] for L in land[2:] for p in L] + [k[0] for k in karsts] + [l["x"] for l in landmark_rows]
    zs = [k[1] for k in karsts] + [l["z"] for l in landmark_rows]
    bounds = {"x_min": round(min(xs) - 300), "x_max": round(max(xs) + 300), "z_min": round(min(zs) - 400), "z_max": round(max(zs) + 300)}

    data = {
        "version": 1,
        "map": {
            "id": "halong_bay", "kind": "bay", "name": "Vịnh Hạ Long – Lan Hạ – Bái Tử Long · Du thuyền Yên", "status": "live",
            "sky_color": "#bcd8e8", "fog_color": "#cfe0e6", "fog_density": 0.00105, "ground_color": "#2f9c8a",
            "hemi_sky": "#eaf4ff", "hemi_ground": "#3c7f72", "hemi_intensity": 1.9,
            "sun_color": "#fff2dc", "sun_intensity": 2.1, "sun_position": [60, 90, -40],
            "ambience": "sea_waves",
            "spawn": {"x": port["approach"][0], "z": port["approach"][1], "heading": 1.05},
            "bounds": bounds,
            "geo": {"origin_lat": LAT0, "origin_lon": LON0, "meters_per_unit": METERS_PER_UNIT,
                    "axes": "x = Đông, z = Nam", "note": "Toạ độ chiếu phẳng quanh cảng Tuần Châu; kích thước đảo được phóng đại để dễ nhìn"},
            "time_slots": {
                "morning": {"status": "live", "label": "Buổi sáng", "sky_top": "#7fb6dc", "sky_horizon": "#dfeef2", "haze": "#cfe0e6",
                            "sun_elevation": 0.55, "sun_azimuth": 2.4, "water_deep": "#1f7f74", "water_shallow": "#47b39d",
                            "cloud_cover": 0.42},
                "dawn_dusk": {"status": "draft", "label": "Bình minh / Hòang hôn"},
                "night": {"status": "draft", "label": "Buổi tối", "lights": ["den_du_thuyen"]}
            },
            "active_time_slot": "morning",
            # Trang phục riêng của vịnh (rừng thông giữ trang phục cũ). group "sea" = đi biển, "zen" = trang phục thiền như ở Rừng Yên.
            "outfits": {
                "styles": [
                    {"id": "robe", "label": "Thiền phục"},
                    {"id": "tee_jeans", "label": "Áo thun · quần jean"},
                    {"id": "suit", "label": "Vest lịch sự"},
                    {"id": "maxi", "label": "Đầm maxi đi chơi"},
                    {"id": "ao_dai", "label": "Áo dài truyền thống"}
                ],
                "accessories": [{"id": "hat", "label": "Nón"}, {"id": "glasses", "label": "Kính"}, {"id": "scarf", "label": "Khăn"}],
                "colors": [["Vàng", "#d9b67d"], ["Xanh", "#90b7a5"], ["Kem", "#f0e5d4"], ["Tím", "#b5a1c7"], ["Rêu", "#687b48"], ["Hồng", "#e8a1b4"]],
                "default": {"style": "tee_jeans", "color": "#90b7a5", "acc": []}
            }
        },
        "nature": [
            {"id": "halong_bay.sea", "kind": "sea", "sort_order": 1, "params": {"wave_scale": 1, "swell": 0.35}},
            {"id": "halong_bay.coast", "kind": "land", "sort_order": 2,
             "params": {"polygons": [{"name": "Bãi Cháy", "pts": land[0], "height": 14, "color": "#6f9a62", "hills": 26},
                                     {"name": "Hòn Gai", "pts": land[1], "height": 16, "color": "#6a965f", "hills": 22},
                                     {"name": "Đảo Tuần Châu", "pts": land[2], "height": 8, "color": "#78a46c", "hills": 5},
                                     {"name": "Đường nối Tuần Châu", "pts": land[3], "height": 3, "color": "#c9bfa4"},
                                     {"name": "Đảo Cát Bà", "pts": land[4], "height": 18, "color": "#5f8f5a", "hills": 30},
                                     {"name": "Đảo Cái Bầu (Vân Đồn)", "pts": land[5], "height": 16, "color": "#63935c", "hills": 28},
                                     {"name": "Đảo Quan Lạn", "pts": land[6], "height": 8, "color": "#76a06a", "hills": 12},
                                     {"name": "Đảo Trà Bản", "pts": land[7], "height": 12, "color": "#6a965f", "hills": 20},
                                     {"name": "Đảo Ba Mùn", "pts": land[8], "height": 14, "color": "#5f8f5a", "hills": 24}],
                        "precision": "approx"}},
            {"id": "halong_bay.backdrop", "kind": "backdrop", "sort_order": 0,
             "params": {"style": "painted_panorama", "seed": 1119, "radius": 2200, "top": 420, "haze": "#cfe0e6",
                        "far_rock": "#a9bdbf", "near_rock": "#7f9a8c", "leaf": "#6f8f62", "north_span": 0.75,
                        "note": "Phông tranh 360° vẽ bằng code: các lớp núi đá xa sau đảo 3D; hướng bắc là đồi bờ Hạ Long"}},
            {"id": "halong_bay.karsts", "kind": "karst_field", "sort_order": 3,
             "params": {"seed": 20261119, "zones": [z["name"] for z in KARST_ZONES],
                        "fields": ["x", "z", "radius", "height", "shape"], "shapes": ["tháp", "chóp nhọn", "đồi tròn", "dãy dài", "hai đỉnh", "nấm", "răng nghiêng", "hòn nhỏ"], "items": karsts}},
            {"id": "halong_bay.labels", "kind": "map_labels", "sort_order": 5,
             "params": {"items": [{"name": "VỊNH HẠ LONG", "x": xz(20.875, 107.120)[0], "z": xz(20.875, 107.120)[1], "sub": "Quảng Ninh"},
                                  {"name": "VỊNH LAN HẠ", "x": xz(20.752, 107.150)[0], "z": xz(20.752, 107.150)[1], "sub": "Hải Phòng"},
                                  {"name": "ĐẢO CÁT BÀ", "x": xz(20.785, 106.975)[0], "z": xz(20.785, 106.975)[1], "sub": ""},
                                  {"name": "VỊNH BÁI TỬ LONG", "x": xz(20.945, 107.470)[0], "z": xz(20.945, 107.470)[1], "sub": "Vân Đồn · Quảng Ninh"},
                                  {"name": "ĐẢO QUAN LẠN", "x": xz(20.925, 107.600)[0], "z": xz(20.925, 107.600)[1], "sub": ""},
                                  {"name": "ĐẢO CÁI BẦU", "x": xz(21.110, 107.420)[0], "z": xz(21.110, 107.420)[1], "sub": ""}]}},
            {"id": "halong_bay.regions", "kind": "map_regions", "sort_order": 6, "params": {"items": REGIONS}},
            {"id": "halong_bay.channels", "kind": "channels", "sort_order": 4,
             "params": {"half_width": CORRIDOR_HALF_WIDTH, "lines": [[list(p) for p in c] for c in corridors]}},
        ],
        "rooms": [
            {"id": "du_thuyen_mui", "name": "Mũi du thuyền", "topic": "anyen:room:halong-bow", "capacity": 30, "kind": "public", "palette_color": "#1d4f52"},
            {"id": "du_thuyen_sanh", "name": "Sảnh lễ tân & Nhà hàng", "topic": "anyen:room:halong-lobby", "capacity": 30, "kind": "public", "palette_color": "#3a3226", "interior": {"status": "draft"}},
            {"id": "du_thuyen_tra", "name": "Khoang Trà đạo & Piano", "topic": "anyen:room:halong-tea", "capacity": 12, "kind": "public", "palette_color": "#2e3a2e", "interior": {"status": "draft"}},
            {"id": "du_thuyen_sundeck", "name": "Boong thượng Sundeck", "topic": "anyen:room:halong-sundeck", "capacity": 20, "kind": "public", "palette_color": "#204a5a", "interior": {"status": "draft"}},
            {"id": "du_thuyen_cabin", "name": "Phòng nghỉ Ban công & Spa", "topic": "anyen:room:halong-cabin", "capacity": 4, "kind": "public", "palette_color": "#3d3540", "interior": {"status": "draft"}},
        ],
        "buildings": [
            {"id": "du_thuyen_yen", "name": "Du thuyền Yên", "kind": "cruise_ship", "x": port["approach"][0], "z": port["approach"][1],
             "exterior": {"length": 46, "beam": 10, "decks": 3, "hull_color": "#2f8c8a", "body_color": "#f4f2ec", "deck_wood": "#a07e60", "rail_wood": "#9a6448",
                          "glass": "#3f5f6c", "max_speed": 10, "turn_rate": 0.45, "clearance": 26, "bow_spot": [0, 2.62, 18.8],
                          "deck_spot": [0, 11.06, -1.4],
                          "real_speed_kmh": 15, "real_speed_note": "Tốc độ ước tính của tàu du lịch trên vịnh, dùng để tính thời gian ngoài đời",
                          "views": [{"id": "bow", "label": "Mũi tàu", "note": "Đứng ở mũi tàu, nhìn về phía trước"},
                                    {"id": "sundeck", "label": "Boong thượng", "note": "Lên tầng cao nhất, ngắm toàn cảnh"},
                                    {"id": "far", "label": "Ngắm tàu từ xa", "note": "Nhìn cả du thuyền lướt giữa các đảo"},
                                    {"id": "spin", "label": "Tự xoay 360°", "note": "Góc nhìn chậm rãi xoay quanh"}]},
             "entry": {"label": "Vào du thuyền", "status": "draft", "rooms": ["du_thuyen_sanh", "du_thuyen_tra", "du_thuyen_sundeck", "du_thuyen_cabin"]},
             "room_id": "du_thuyen_mui"},
        ],
        "props": [{"id": l["id"], "kind": "landmark", "name": l["name"], "x": l["x"], "z": l["z"],
                   "params": {k: l[k] for k in ("lat", "lon", "shape", "radius", "height", "precision", "source", "description", "approach", "region")},
                   "activity": {"dao_ti_top": "swim", "hang_luon": "kayak", "lang_chai_cua_van": "kayak"}.get(l["id"])}
                  for l in landmark_rows] + junks + buoys + [
                  {"id": t["id"], "kind": "tour", "name": t["name"], "x": port["approach"][0], "z": port["approach"][1],
                   "params": {"summary": t["summary"], "stops": [{"landmark": i, "dwell": d, "note": n} for i, d, n in t["stops"]]},
                   "activity": "cruise_stand"} for t in TOURS],
        "npcs": [
            {"id": "thuyen_truong", "name": "Thuyền trưởng Hải", "role": "captain", "x": 0, "z": 6, "facing": 0, "greet_radius": 5,
             "greeting": "Chào bạn, hôm nay biển lặng, mình đưa bạn đi ngắm vịnh nhé.", "dialogue": [], "ai_enabled": False, "ai_config": None, "active": False},
            {"id": "le_tan", "name": "Lễ tân Mai", "role": "cruise_receptionist", "x": 0, "z": 0, "facing": 0, "greet_radius": 4,
             "greeting": "Chào mừng bạn lên Du thuyền Yên.", "dialogue": [], "ai_enabled": False, "ai_config": None, "active": False},
            {"id": "tra_chu", "name": "Trà chủ An", "role": "tea_master", "x": 0, "z": -6, "facing": 0, "greet_radius": 4,
             "greeting": "Mời bạn một chén trà, ngắm vịnh cho lòng lắng lại.", "dialogue": [], "ai_enabled": False, "ai_config": None, "active": False},
        ],
    }
    out = os.path.join(os.path.dirname(__file__), "..", "data", "world-halong_bay.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    print("karsts", len(karsts), "junks", len(junks), "buoys", len(buoys), "bounds", bounds, "bytes", os.path.getsize(out))

if __name__ == "__main__":
    main()
