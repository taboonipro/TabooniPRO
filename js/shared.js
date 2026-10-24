/* ========= مشترك: التطبيق كله (زبون + إدارة) ========= */
var APP_VERSION = '1.12';   // رقم النسخة: بيتحدّث مع كل تحديث (ويطلع تحت بشاشة الدخول وبإعدادات الإدارة)
var CFG = window.TABOONI_CONFIG || {};
var IS_GAS = false;
// السيرفر: مشروع Supabase (الرابط + المفتاح العام anon/publishable من Project Settings ← API)
var IS_LIVE = /^https?:\/\/[a-z0-9.-]+(:\d+)?$/i.test(String(CFG.SUPABASE_URL || '')) && String(CFG.SUPABASE_ANON_KEY || '').length > 20 && !!window.supabase;
var IS_DEMO = !IS_LIVE && typeof Mock !== 'undefined';
// رابط التطبيق نفسه: منه بتنبني روابط البطاقات والتقييم (ما في حاجة لإعداد)
var APP_URL = (function(){ var u = location.href.split('?')[0].split('#')[0]; return location.protocol === 'https:' ? u.replace(/index\.html$/i, '') : u; })();
var CUSTOMER_URL = APP_URL, ADMIN_URL = APP_URL;
var PAGE = 'customer';
// الصور (ملفات منفصلة: بتتخزّن بالتلفون وبتفتح أسرع)
var LOGO_SRC = 'assets/logo.webp', PIZZA_SRC = 'assets/pizza.webp', BOAT_SRC = 'assets/boat.webp';
function cardUrl(id){ return CUSTOMER_URL + '?c=' + encodeURIComponent(id); }
function tokenUrl(tok){ return CUSTOMER_URL + '?t=' + encodeURIComponent(tok); }

var T = {
  ar: {
    brand:'طابوني برو', switchTo:'עברית',
    consent:'أوافق على أن يحتفظ طابوني برو باسمي ورقم هاتفي وتاريخ ميلادي لبطاقة VIP فقط، وأن يرسل لي تذكيرات وتحديثات عبر واتساب. يمكنني طلب حذف معلوماتي في أي وقت.',
    privacyNote:'معلوماتك بتنستعمل لبرنامج VIP بس. لحذفها ابعثلنا على واتساب.',
    deleteCustomer:'حذف الزبون', confirmDelete:'حذف نهائي لمعلومات {name}؟ الطبعات والهدايا بتنحذف وما بترجع.',
    logoutAll:'طلّع كل الأجهزة', logoutAllDone:'كل الأجهزة طلعت. ادخل من جديد.', idleOut:'طلعت تلقائياً بعد 30 دقيقة بدون استعمال.',
    publicUrl:'رابط صفحة الزبون (من مشروع الزبون ← Deploy ← Web app URL)', needPublicUrl:'قبل ما تبعث روابط: حط رابط صفحة الزبون بالإعدادات.',
    noConsent:'بدون موافقة مسجّلة', unverified:'رقم غير مؤكد', rotateLink:'رابط بطاقة جديد', confirmRotate:'الرابط القديم للبطاقة رح يوقف يشتغل. تكمل؟', rotated:'انعمل رابط جديد. ابعثه للزبون من "ابعث البطاقة".',
    joinTitle:'اشترك بطابوني برو VIP', joinSub:'كل بيتسا بتوخذها = طبعة. 5 طبعات = قارب بيتسا هدية، و10 طبعات = بيتسا نابولي كاملة هدية.',
    joinBtn:'اشترك وافتح بطاقتي', joinedExisting:'تمام، وصلنا طلبك! معلومات الدخول لبطاقتك بتوصلك على واتساب.', welcome:'أهلاً فيك بالبرنامج! هاي بطاقتك.',
    howTitle:'كيف بتجمع طبعات؟', how1:'بعد كل طلب، التقييم بيستنّاك بالتطبيق.', how2:'بتدخل وبتقيّم بكبسة، والطبعة بتنضاف فوراً.', how3:'التقييم لطلب اليوم، ولمرة وحدة.', st1:'اطلب بيتسا', st2:'ادخل على التطبيق', st3:'قيّم بكبسة وخذ طبعتك', stTitle:'كيف بتاخذ طبعة؟',
    sendStampLink:'سجّل طلب', sendCard:'ابعث البطاقة', linkOpen:'رابط مبعوث', linkFor:'رابط الطبعة جاهز لـ',
    cardMsg:'السلام عليكم، شو الأخبار {name}؟\nهاي بطاقة طابوني برو VIP تبعتك.\nمن هون بتقدر تشوف قديش صار معك طبعات، وكم متبقي لك للهدية الجاية:\n',
    waMsgNamed:'السلام عليكم، شو الأخبار {name}؟\nشكراً على طلبك من طابوني برو!\nقيّمنا بكبسة وبتنضافلك {stamps} على بطاقتك (الرابط إلك بس ولمرة وحدة):\n',
    qtyLabel:'عدد البيتسا بالطلب', qtyEq:'= {stamps} على البطاقة', qtyPizzas:'{n} بيتسا', createFor:'سجّل الطلب',
    cardMsgF:'السلام عليكم، شو الأخبار {name}؟\nهاي بطاقة طابوني برو VIP تبعتك.\nمن هون بتقدري تشوفي قديش صار معك طبعات، وكم متبقي لك للهدية الجاية:\n',
    orderSaved:'الطلب انسجّل', orderInApp:'التقييم بيستنّاه بالتطبيق: أول ما يدخل بيطلعله، وبعد ما يقيّم بتنضاف الطبعات. صالح لليوم بس.',
    orderNoLogin:'هالزبون ما عنده حساب، فبيوصله رابط تقييم. الأحسن: اعمله كلمة سر للدخول.', sendNudge:'ذكّره على واتساب (اختياري)',
    orderAppMsg:'السلام عليكم، شو الأخبار {name}؟\nشكراً على طلبك من طابوني برو!\nادخل على التطبيق وقيّم الطلب، وبتنضافلك {stamps} على بطاقتك:\n',
    orderAppMsgF:'السلام عليكم، شو الأخبار {name}؟\nشكراً على طلبك من طابوني برو!\nادخلي على التطبيق وقيّمي الطلب، وبتنضافلك {stamps} على بطاقتك:\n',
    waMsgNamedF:'السلام عليكم، شو الأخبار {name}؟\nشكراً على طلبك من طابوني برو!\nقيّمينا بكبسة وبتنضافلك {stamps} على بطاقتك (الرابط إلك بس ولمرة وحدة):\n',
    nudgeMsgBOATF:'السلام عليكم، شو الأخبار {name}؟\nمتبقي لك طلب واحد بس من طابوني برو وبتوصلك هدية: قارب بيتسا نابولي.\nبنستناكي!',
    nudgeMsgPIZZAF:'السلام عليكم، شو الأخبار {name}؟\nمتبقي لك طلب واحد بس من طابوني برو وبتوصلك هدية: بيتسا نابولي كاملة.\nبنستناكي!',
    giftMsgF:'السلام عليكم، شو الأخبار {name}؟\nمبروك! ربحتي {gift} من طابوني برو.\nاذكريها بطلبك الجاي ونحنا بنزبطها.',
    bdayMsg:'السلام عليكم، شو الأخبار {name}؟\nكل عام وانت بخير! بمناسبة عيد ميلادك، إلك هدية من طابوني برو: بيتسا كنافة مجاناً مع أي بيتسا نابولي بتطلبها.\nالعرض صالح لمدة أسبوع.',
    bdayMsgF:'السلام عليكم، شو الأخبار {name}؟\nكل عام وانتِ بخير! بمناسبة عيد ميلادك، إلك هدية من طابوني برو: بيتسا كنافة مجاناً مع أي بيتسا نابولي بتطلبيها.\nالعرض صالح لمدة أسبوع.',
    genderQ:'الجنس', male:'ذكر', female:'أنثى', bdayLabel:'تاريخ الميلاد (اختياري)', bdayHint:'اليوم والشهر بس، عشان نفاجئك بهدية بعيد ميلادك.', dayPh:'اليوم', monthPh:'الشهر',
    months:'كانون الثاني|شباط|آذار|نيسان|أيار|حزيران|تموز|آب|أيلول|تشرين الأول|تشرين الثاني|كانون الأول',
    tBdays:'أعياد ميلاد', bdaysHint:'زبائن عيد ميلادهم خلال أسبوعين. ابعثلهم تهنئة مع الهدية.', bdayToday:'اليوم!', bdayIn:'بعد {n} يوم', sendBday:'ابعث تهنئة', bdayDone:'انبعتت التهنئة',
    editInfo:'الجنس وعيد الميلاد', saveInfo:'احفظ', noGender:'الجنس مش محدد', giftEarned:'استحقاق:', giftGot:'تم التسليم:', giftWaiting:'بانتظار التسليم', giftNoDate:'(بدون تاريخ)',
    addCustomer:'إضافة زبون جديد', addCustomerHint:'لزبون بتعرفه شخصياً. الرقم بينحفظ كمؤكد.', addBtn:'أضف الزبون', addedOk:'انضاف الزبون: ', cancel:'إلغاء',
    tNudges:'توصيات', nudgesHint:'زبائن متبقي لهم طلب واحد للهدية. تذكير صغير على واتساب بيشجّعهم يطلبوا.', sendReminder:'ابعث تذكير', reminderSent:'انبعت التذكير', resend:'ابعث مرة ثانية',
    oneLeftBOAT:'متبقي له طلب واحد للقارب', oneLeftPIZZA:'متبقي له طلب واحد للبيتسا الكاملة',
    nudgeMsgBOAT:'السلام عليكم، شو الأخبار {name}؟\nمتبقي لك طلب واحد بس من طابوني برو وبتوصلك هدية: قارب بيتسا نابولي.\nبنستناك!',
    nudgeMsgPIZZA:'السلام عليكم، شو الأخبار {name}؟\nمتبقي لك طلب واحد بس من طابوني برو وبتوصلك هدية: بيتسا نابولي كاملة.\nبنستناك!',
    giftsHint:'زبائن وصلوا 5 أو 10 طلبات. بلّغهم، ولما يستلموا اكبس "تسلّمت الهدية".', notifyGift:'بلّغه بواتساب',
    giftMsg:'السلام عليكم، شو الأخبار {name}؟\nمبروك! ربحت {gift} من طابوني برو.\nاذكرها بطلبك الجاي ونحنا بنزبطها.',
    followHint:'تقييمات 3 نجوم وأقل ما انعالجت لسا. احكي مع الزبون، وبعدها اكبس "تمّت المتابعة".', whatsapp:'واتساب',
    followMsg:'السلام عليكم، شو الأخبار {name}؟\nهون طابوني برو. شفنا تقييمك وبهمّنا نفهم شو صار عشان نصلّحه. ممكن تحكيلنا أكثر؟',
    rPositive:'إيجابية (4-5)', rNegative:'بحاجة معالجة (1-3)', rMonth:'هالشهر', rTotal:'المجموع', rOpen:'لسا مفتوحة', rDone:'انعالجت', rNeeded:'بدها متابعة',
    googleUrl:'رابط تقييم Google (من Google Business ← "اطلب تقييمات")', reviewAsk:'مين بيشوف طلب التقييم على Google', contactPhone:'رقم واتساب للتواصل (بيظهر للزبون اللي قيّم 1-3)', copyCard:'انسخ رابط البطاقة', askPositive:'اللي بيقيّموا 4-5 بس', askAll:'كل الزبائن (متوافق مع سياسة Google)',
    reviewTitle:'إذا بتسمح، شارك رأيك على Google', reviewText:'هاد بيساعدنا كثير نوصل لناس أكثر بالمنطقة.', pasteHint:'نسخنالك اللي كتبته، بس الصقه هناك ✓', reviewBtn:'شارك رأيك على Google', contactTitle:'بدك تحكي معنا مباشرة؟', contactText:'رح نهتم بالموضوع شخصياً. ابعثلنا على واتساب ورح نرد عليك.', contactBtn:'تواصل معنا على واتساب', contactMsg:'السلام عليكم، بخصوص طلبي من طابوني برو:',
    tImport:'إضافة زبائن', importHint:'الصق كل زبون بسطر: الاسم ثم الرقم. مثال: أيمن 0501234567', importBtn:'أضف الزبائن', importResult:'انضاف: {a} · موجودين قبل: {s} · أسطر غلط: {i}',
    joinLinkTitle:'رابط الانضمام (للمجموعة وللـQR)', joinLinkHint:'ابعثه لمجموعة الـVIP. كل واحد بيسجّل وبيختار كلمة سر، وبيوصلك بتبويب "تسجيلات جديدة" للموافقة.',
    fbTitle:'كيف كانت البيتسا اليوم؟', fbSub:'قيّم طلبك بثواني وبتنضافلك {stamps} على بطاقتك.',
    r1:'مش راضي', r2:'مش كثير', r3:'منيحة', r4:'طيبة كثير', r5:'ممتازة',
    hello:'أهلاً', nameLabel:'اسمك', namePh:'مثلاً: أيمن', phoneLabel:'رقم تلفونك',
    commentLabel:'احكيلنا عن تجربتك *', commentPh:'اختار النجوم أول', commentLabelPos:'شو أكثر شي عجبك؟ *', commentPhPos:'مثلاً: العجينة، الطعم، الإضافات، سرعة التوصيل…', commentLabelNeg:'شو ما عجبك؟ *', commentPhNeg:'احكيلنا بصراحة عشان نصلّحه',
    submit:'أرسل التقييم واحصل على {stamps}', submitForm:'أرسل التقييم', sending:'عم نسجّل…',
    stampAdded:'صار عندك {new} على بطاقتك!', stampLow:'صار عندك {new} على بطاقتك! وشكراً على صراحتك، رح نتواصل معك قريباً \uD83D\uDE4F', googleNext:'', thanksNoStamp:'شكراً على صراحتك، رح نتواصل معك قريباً.',
    congratsBOAT:'مبروك! ربحت قارب بيتسا نابولي هدية \uD83C\uDF81', congratsPIZZA:'مبروك! ربحت بيتسا نابولي كاملة هدية \uD83C\uDF81',
    customerName:'اسم الزبون', current:'الحالي', purchases:'مشتريات',
    toBoat:'للقارب', toPizza:'لبيتزا كاملة', remaining:'متبقية', reached:'وصلت',
    at5:'عند 5 مشتريات تحصل على', at10:'عند 10 مشتريات تحصل على',
    BOAT:'قارب بيتسا نابولي هدية', PIZZA:'بيتسا نابولي كاملة هدية',
    readyTitle:'هداياك الجاهزة', readyHint:'اذكر الهدية لما تطلب المرة الجاية، ونحنا بنزبطها.',
    saveCard:'احفظ رابط بطاقتك عشان تتابع طبعاتك', copy:'انسخ', copied:'انتسخ ✓', myCard:'بطاقتي',
    usedTitle:'الطبعة موجودة بالبطاقة', usedText:'هذا الرابط انستخدم قبل، والطبعة انضافت.', openCard:'افتح بطاقتي', 
    curPin:'الرمز الحالي', newPin:'رمز جديد (6 خانات على الأقل)', changePin:'غيّر الرمز السري', pinChanged:'الرمز تغيّر. ادخل من جديد بالرمز الجديد.', securityTitle:'الأمان',
    securityHint:'تغيير الرمز بيطلّع كل الأجهزة المفتوحة من اللوحة.', sessionExpired:'انتهت الجلسة. ادخل من جديد.',
    adminTitle:'لوحة الإدارة', pin:'الرمز السري', enter:'دخول', logout:'خروج', refresh:'تحديث', customerPage:'صفحة الزبون',
    newStamp:'تسجيل طلب جديد', newStampHint:'التقييم بيطلع للزبون بالتطبيق، والطبعة بتنضاف لما يقيّم.',
    phone:'رقم الزبون', phonePh:'05XXXXXXXX', whoLabel:'اسم الزبون أو رقم تلفونه', whoPh:'مثلاً: لينا أو 05XXXXXXXX', dupName:'في أكثر من زبون بالاسم "{name}". شو رقم تلفونه؟', noMatch:'ما لقينا زبون بهالاسم. اكتب رقم تلفونه، أو ضيفه من تبويب زبائن.', orTypePhone:'أو اكتب الرقم بالخانة', note:'ملاحظة للطلب (اختياري)', notePh:'مثلاً: 2 مارغريتا',
    createLink:'سجّل الطلب', linkReady:'الرابط جاهز', newCustomer:'زبون جديد', sendWa:'ابعث بواتساب',
    waMsg:'السلام عليكم، شو الأخبار؟\nشكراً على طلبك من طابوني برو! قيّمنا بثواني واحصل على {stamps} في بطاقتك:\n',
    sCustomers:'زبائن', sStamps:'طبعات هالشهر', sAvg:'معدل التقييم هالشهر', sGifts:'هدايا بانتظار التسليم', sFollow:'تقييمات بدها متابعة',
    tFollow:'متابعة', tGifts:'هدايا', tCustomers:'زبائن', tLinks:'طلبات بانتظار تقييم', tRecent:'التقييمات', tSettings:'إعدادات',
    redeem:'تسلّمت الهدية', markDone:'تمّت المتابعة', delReview:'حذف التقييم', confirmDelReview:'حذف هذا التقييم؟ ما رح ينحسب بالإحصائيات، والطبعات اللي انضافت للزبون بتضل مثل ما هي.', call:'اتصال', card:'البطاقة', qr:'QR',
    addStamp:'أضف طبعة', removeStamp:'نقّص طبعة', rename:'الاسم', renamePrompt:'الاسم الجديد:', confirmRemove:'تنقّص طبعة من هذا الزبون؟',
    cancelLink:'إلغاء', confirmCancel:'تلغي هذا الرابط؟',
    viaLink:'من رابط', viaForm:'من الصفحة', stamps:'طبعات', noComment:'بدون تعليق', empty:'ما في إشي هون حالياً.', search:'ابحث بالاسم أو الرقم',
    setMin:'أقل تقييم بياخذ طبعة (1–5)', setHours:'صلاحية رابط التقييم بالساعات', setLow:'التقييم بيدخل المتابعة إذا كان أقل من أو يساوي',
    setEmail:'إيميل للتنبيهات: تقييم منخفض، قفل اللوحة، تغيير الرمز', save:'احفظ الإعدادات', saved:'انحفظت ✓',
    qrHint:'اطبع هذا الكود أو ابعثه للزبون.', close:'سكّر', confirmRedeem:'متأكد إن الهدية تسلّمت؟', rewardNow:'الزبون ربح هدية: ',
    demo:'وضع تجريبي: البيانات محفوظة بهذا المتصفح فقط.', demoCustomer:'انضمام', demoLink:'رابط تقييم', demoCard:'بطاقة تجريبية', demoAdmin:'دخول (إدارة: admin / 12345678 — زبون: 0501234567 / 123456)', demoReset:'صفّر التجربة',
    err:{
      TOKEN_INVALID:'الرابط غير صحيح. افتح الرابط كامل من رسالة الواتساب.',
      TOKEN_EXPIRED:'انتهت صلاحية الرابط. اطلب رابط جديد من طابوني برو.',
      TOKEN_USED:'هذا الرابط انستخدم قبل.', NEED_NAME:'اكتب اسمك عشان نسجّل البطاقة باسمك.', NEED_CONSENT:'لازم توافق على الشرط عشان نسجّلك.', NEED_GENDER:'اختار ذكر أو أنثى.', BAD_BDAY:'تاريخ الميلاد غلط. اختار اليوم والشهر.', EXISTS:'هذا الرقم مسجّل من قبل. دوّر عليه بالقائمة.', BAD_REVIEW_URL:'رابط Google لازم يكون https ومن Google (g.page أو search.google.com أو maps.app.goo.gl).', BAD_NAME:'الاسم لازم يكون حروف بس، بدون أرقام أو رموز أو روابط.', BAD_URL:'رابط صفحة الزبون مش محطوط أو غلط. روح لمشروع Tabooni Public ← Deploy ← Manage deployments ← انسخ Web app URL (بينتهي بـ /exec) ← الصقه بالإعدادات هون ← احفظ.', DEV_URL:'هذا رابط تجربة (/dev) وبيشتغل إلك بس. خذ الرابط من Deploy ← Manage deployments، اللي بينتهي بـ /exec.', ADMIN_URL:'هذا رابط لوحة الإدارة. لازم تحط رابط مشروع Tabooni Public.', FORBIDDEN:'ما عندك صلاحية.', BAD_RATING:'اختار عدد النجوم أول.', NEED_COMMENT:'اكتبلنا رأيك بكم كلمة قبل الإرسال.',
      BAD_PHONE:'الرقم لازم يكون 10 أرقام ويبدأ بـ 05.', WRONG_PIN:'الرمز غلط.', WEAK_PIN:'الرمز ضعيف: لازم 6 خانات على الأقل، ومش أرقام متتالية أو مكررة.', NO_SESSION:'انتهت الجلسة. ادخل من جديد.', RATE_LIMIT:'في ضغط هلأ. جرّب بعد دقيقة.',
      TOO_SOON:'وصلنا تقييم من هذا الرقم قبل شوي، وهو بانتظار التأكيد.',
      LOCKED:'محاولات كثيرة. اللوحة مقفولة 15 دقيقة.', CARD_NOT_FOUND:'ما لقينا هاي البطاقة. تأكد من الرابط.',
      NETWORK:'ما في اتصال. تأكد من الإنترنت وجرّب مرة ثانية.', SETUP_MISSING:'النظام مش جاهز: شغّل setup() من Apps Script.',
      DEFAULT:'صار خطأ. جرّب مرة ثانية.'
    }
  },
  he: {
    brand:'טאבוני פרו', switchTo:'عربي',
    consent:'אני מסכים/ה שטאבוני פרו ישמור את השם, מספר הטלפון ותאריך הלידה שלי לכרטיס VIP בלבד, וישלח לי תזכורות ועדכונים בוואטסאפ. אפשר לבקש מחיקה של הפרטים בכל עת.',
    privacyNote:'הפרטים שלך משמשים לתוכנית החותמות בלבד. למחיקה שלחו לנו הודעה בוואטסאפ.',
    deleteCustomer:'מחיקת לקוח', confirmDelete:'למחוק לצמיתות את הפרטים של {name}? החותמות והמתנות יימחקו ללא שחזור.',
    logoutAll:'ניתוק כל המכשירים', logoutAllDone:'כל המכשירים נותקו. היכנסו מחדש.', idleOut:'נותקת אוטומטית אחרי 30 דקות ללא פעילות.',
    publicUrl:'קישור דף הלקוח (מפרויקט הלקוח ← Deploy ← Web app URL)', needPublicUrl:'לפני שליחת קישורים: הזינו את קישור דף הלקוח בהגדרות.',
    noConsent:'ללא הסכמה רשומה', unverified:'מספר לא מאומת', rotateLink:'קישור כרטיס חדש', confirmRotate:'הקישור הישן לכרטיס יפסיק לעבוד. להמשיך?', rotated:'נוצר קישור חדש. שלחו אותו ללקוח דרך "שליחת הכרטיס".',
    joinTitle:'הצטרפות לטאבוני פרו VIP', joinSub:'כל פיצה = חותמת. 5 חותמות = סירת פיצה במתנה, ו-10 חותמות = פיצה נפוליטנית שלמה במתנה.',
    joinBtn:'הצטרפות ופתיחת הכרטיס', joinedExisting:'מעולה, קיבלנו! פרטי הכניסה לכרטיס יגיעו אליכם בוואטסאפ.', welcome:'ברוכים הבאים לתוכנית! זה הכרטיס שלכם.',
    howTitle:'איך אוספים חותמות?', how1:'אחרי כל הזמנה, הדירוג מחכה לכם באפליקציה.', how2:'נכנסים, מדרגים בלחיצה, והחותמת נוספת מיד.', how3:'הדירוג להזמנה של היום, פעם אחת בלבד.', st1:'מזמינים פיצה', st2:'נכנסים לאפליקציה', st3:'מדרגים בלחיצה ומקבלים חותמת', stTitle:'איך מקבלים חותמת?',
    sendStampLink:'רישום הזמנה', sendCard:'שליחת הכרטיס', linkOpen:'קישור נשלח', linkFor:'קישור החותמת מוכן עבור',
    cardMsg:'שלום, מה שלומך {name}?\nזה כרטיס טאבוני פרו VIP שלך.\nכאן אפשר לראות כמה חותמות צברת וכמה נשארו למתנה הבאה:\n',
    waMsgNamed:'שלום, מה שלומך {name}?\nתודה על ההזמנה מטאבוני פרו!\nדרגו אותנו בלחיצה ותקבלו {stamps} בכרטיס (הקישור אישי וחד-פעמי):\n',
    orderSaved:'ההזמנה נרשמה', orderInApp:'הדירוג מחכה ללקוח באפליקציה: יופיע בכניסה הבאה, והחותמות יתווספו אחרי הדירוג. בתוקף להיום בלבד.',
    orderNoLogin:'ללקוח הזה אין חשבון, לכן יקבל קישור לדירוג. עדיף: ליצור לו סיסמה לכניסה.', sendNudge:'תזכורת בוואטסאפ (לא חובה)',
    orderAppMsg:'שלום, מה שלומך {name}?\nתודה על ההזמנה מטאבוני פרו!\nהיכנסו לאפליקציה ודרגו את ההזמנה, ותקבלו {stamps} בכרטיס:\n',
    qtyLabel:'מספר הפיצות בהזמנה', qtyEq:'= {stamps} בכרטיס', qtyPizzas:'{n} פיצות', createFor:'רישום ההזמנה',
    nudgeMsgBOATF:'שלום, מה שלומך {name}?\nנשארה לך רק הזמנה אחת מטאבוני פרו ותקבלי מתנה: סירת פיצה נפוליטנית.\nמחכים לך!',
    nudgeMsgPIZZAF:'שלום, מה שלומך {name}?\nנשארה לך רק הזמנה אחת מטאבוני פרו ותקבלי מתנה: פיצה נפוליטנית שלמה.\nמחכים לך!',
    bdayMsg:'שלום, מה שלומך {name}?\nמזל טוב ליום ההולדת! לכבוד היום, מתנה מטאבוני פרו: פיצה כנאפה חינם עם כל פיצה נפוליטנית שתזמין.\nההטבה בתוקף לשבוע.',
    bdayMsgF:'שלום, מה שלומך {name}?\nמזל טוב ליום ההולדת! לכבוד היום, מתנה מטאבוני פרו: פיצה כנאפה חינם עם כל פיצה נפוליטנית שתזמיני.\nההטבה בתוקף לשבוע.',
    genderQ:'מגדר', male:'זכר', female:'נקבה', bdayLabel:'תאריך לידה (לא חובה)', bdayHint:'רק יום וחודש, כדי להפתיע אתכם במתנה ביום ההולדת.', dayPh:'יום', monthPh:'חודש',
    months:'ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר',
    tBdays:'ימי הולדת', bdaysHint:'לקוחות עם יום הולדת בשבועיים הקרובים. שלחו ברכה עם המתנה.', bdayToday:'היום!', bdayIn:'בעוד {n} ימים', sendBday:'שליחת ברכה', bdayDone:'הברכה נשלחה',
    editInfo:'מגדר ויום הולדת', saveInfo:'שמירה', noGender:'מגדר לא מוגדר', giftEarned:'זכאות:', giftGot:'נמסרה:', giftWaiting:'ממתינה למסירה', giftNoDate:'(ללא תאריך)',
    addCustomer:'הוספת לקוח חדש', addCustomerHint:'ללקוח שאתם מכירים אישית. המספר נשמר כמאומת.', addBtn:'הוספת הלקוח', addedOk:'הלקוח נוסף: ', cancel:'ביטול',
    tNudges:'המלצות', nudgesHint:'לקוחות שנשארה להם הזמנה אחת למתנה. תזכורת קטנה בוואטסאפ מעודדת אותם להזמין.', sendReminder:'שליחת תזכורת', reminderSent:'התזכורת נשלחה', resend:'שליחה שוב',
    oneLeftBOAT:'נשארה הזמנה אחת לסירה', oneLeftPIZZA:'נשארה הזמנה אחת לפיצה שלמה',
    nudgeMsgBOAT:'שלום, מה שלומך {name}?\nנשארה לך רק הזמנה אחת מטאבוני פרו ותקבל מתנה: סירת פיצה נפוליטנית.\nמחכים לך!',
    nudgeMsgPIZZA:'שלום, מה שלומך {name}?\nנשארה לך רק הזמנה אחת מטאבוני פרו ותקבל מתנה: פיצה נפוליטנית שלמה.\nמחכים לך!',
    giftsHint:'לקוחות שהגיעו ל-5 או 10 הזמנות. עדכנו אותם, וכשהם מקבלים לחצו "המתנה נמסרה".', notifyGift:'עדכון בוואטסאפ',
    giftMsg:'שלום, מה שלומך {name}?\nמזל טוב! זכית ב{gift} מטאבוני פרו.\nציינו את זה בהזמנה הבאה ואנחנו נדאג לשאר.',
    followHint:'דירוגים של 3 כוכבים ומטה שעוד לא טופלו. דברו עם הלקוח ואז לחצו "טופל".', whatsapp:'וואטסאפ',
    followMsg:'שלום, מה שלומך {name}?\nכאן טאבוני פרו. ראינו את הדירוג שלך וחשוב לנו להבין מה קרה כדי לתקן. אפשר לספר לנו עוד?',
    rPositive:'חיוביים (4-5)', rNegative:'דורשים טיפול (1-3)', rMonth:'החודש', rTotal:'סה"כ', rOpen:'עדיין פתוחים', rDone:'טופל', rNeeded:'דורש מעקב',
    googleUrl:'קישור לביקורת בגוגל (מ-Google Business ← "בקשת ביקורות")', reviewAsk:'מי רואה בקשה לביקורת בגוגל', contactPhone:'מספר וואטסאפ ליצירת קשר (מוצג ללקוח שדירג 1-3)', copyCard:'העתקת קישור הכרטיס', askPositive:'רק מי שדירג 4-5', askAll:'כל הלקוחות (תואם למדיניות של גוגל)',
    reviewTitle:'אם מתאים לכם, שתפו את דעתכם בגוגל', reviewText:'זה עוזר לנו מאוד להגיע לעוד אנשים באזור.', pasteHint:'העתקנו את מה שכתבתם, רק להדביק שם ✓', reviewBtn:'שיתוף בגוגל', contactTitle:'רוצים לדבר איתנו ישירות?', contactText:'נטפל בזה אישית. שלחו לנו בוואטסאפ ונחזור אליכם.', contactBtn:'פנייה בוואטסאפ', contactMsg:'שלום, לגבי ההזמנה שלי מטאבוני פרו:',
    tImport:'הוספת לקוחות', importHint:'הדביקו כל לקוח בשורה: שם ואז מספר. לדוגמה: איימן 0501234567', importBtn:'הוספת הלקוחות', importResult:'נוספו: {a} · כבר קיימים: {s} · שורות שגויות: {i}',
    joinLinkTitle:'קישור ההצטרפות (לקבוצה ול-QR)', joinLinkHint:'שלחו אותו לקבוצת ה-VIP. כל אחד נרשם ובוחר סיסמה, ומופיע אצלכם בלשונית "הרשמות חדשות" לאישור.',
    fbTitle:'איך הייתה הפיצה היום?', fbSub:'דרגו את ההזמנה בכמה שניות ותקבלו {stamps} בכרטיס.',
    r1:'לא מרוצה', r2:'לא משהו', r3:'בסדר', r4:'טעימה מאוד', r5:'מושלמת',
    hello:'היי', nameLabel:'השם שלך', namePh:'לדוגמה: איימן', phoneLabel:'מספר הטלפון שלך',
    commentLabel:'ספרו לנו על החוויה *', commentPh:'בחרו קודם כוכבים', commentLabelPos:'מה הכי אהבתם? *', commentPhPos:'למשל: הבצק, הטעם, התוספות, מהירות המשלוח…', commentLabelNeg:'מה לא אהבתם? *', commentPhNeg:'ספרו לנו בכנות כדי שנתקן',
    submit:'שלחו דירוג וקבלו {stamps}', submitForm:'שליחת הדירוג', sending:'רושמים…',
    stampAdded:'יש לך {new} בכרטיס!', stampLow:'יש לך {new} בכרטיס! ותודה על הכנות, ניצור איתך קשר בקרוב \uD83D\uDE4F', googleNext:'', thanksNoStamp:'תודה על הכנות, ניצור איתכם קשר בקרוב.',
    congratsBOAT:'מזל טוב! זכיתם בסירת פיצה נפוליטנית במתנה \uD83C\uDF81', congratsPIZZA:'מזל טוב! זכיתם בפיצה נפוליטנית שלמה במתנה \uD83C\uDF81',
    customerName:'שם הלקוח', current:'כרגע', purchases:'רכישות',
    toBoat:'לסירה', toPizza:'לפיצה שלמה', remaining:'נותרו', reached:'הגעתם',
    at5:'ב-5 רכישות תקבלו', at10:'ב-10 רכישות תקבלו',
    BOAT:'סירת פיצה נפוליטנית במתנה', PIZZA:'פיצה נפוליטנית שלמה במתנה',
    readyTitle:'המתנות שמחכות לכם', readyHint:'ציינו את המתנה בהזמנה הבאה ואנחנו נדאג לשאר.',
    saveCard:'שמרו את הקישור לכרטיס כדי לעקוב אחרי החותמות', copy:'העתקה', copied:'הועתק ✓', myCard:'הכרטיס שלי',
    usedTitle:'החותמת כבר בכרטיס', usedText:'הקישור הזה כבר נוצל, והחותמת נוספה.', openCard:'לכרטיס שלי', 
    curPin:'הקוד הנוכחי', newPin:'קוד חדש (לפחות 6 תווים)', changePin:'שינוי הקוד הסודי', pinChanged:'הקוד שונה. היכנסו מחדש עם הקוד החדש.', securityTitle:'אבטחה',
    securityHint:'שינוי הקוד מנתק את כל המכשירים המחוברים ללוח.', sessionExpired:'החיבור פג. היכנסו מחדש.',
    adminTitle:'לוח ניהול', pin:'קוד סודי', enter:'כניסה', logout:'יציאה', refresh:'רענון', customerPage:'דף הלקוח',
    newStamp:'רישום הזמנה חדשה', newStampHint:'הדירוג מופיע ללקוח באפליקציה, והחותמת מתווספת כשהוא מדרג.',
    phone:'מספר הלקוח', phonePh:'05XXXXXXXX', whoLabel:'שם הלקוח או מספר הטלפון', whoPh:'לדוגמה: לינה או 05XXXXXXXX', dupName:'יש יותר מלקוח אחד בשם "{name}". מה מספר הטלפון שלו?', noMatch:'לא מצאנו לקוח בשם הזה. הקלידו את מספר הטלפון, או הוסיפו אותו בלשונית לקוחות.', orTypePhone:'או הקלידו את המספר בשדה', note:'הערה להזמנה (לא חובה)', notePh:'לדוגמה: 2 מרגריטה',
    createLink:'רישום ההזמנה', linkReady:'הקישור מוכן', newCustomer:'לקוח חדש', sendWa:'שליחה בוואטסאפ',
    waMsg:'שלום, מה שלומך?\nתודה על ההזמנה מטאבוני פרו! דרגו אותנו בכמה שניות וקבלו {stamps} בכרטיס:\n',
    sCustomers:'לקוחות', sStamps:'חותמות החודש', sAvg:'דירוג ממוצע החודש', sGifts:'מתנות שממתינות למסירה', sFollow:'דירוגים שדורשים מעקב',
    tFollow:'מעקב', tGifts:'מתנות', tCustomers:'לקוחות', tLinks:'הזמנות שממתינות לדירוג', tRecent:'דירוגים', tSettings:'הגדרות',
    redeem:'המתנה נמסרה', markDone:'טופל', delReview:'מחיקת הדירוג', confirmDelReview:'למחוק את הדירוג? הוא לא ייספר בסטטיסטיקה, והחותמות שנוספו ללקוח יישארו.', call:'חיוג', card:'הכרטיס', qr:'QR',
    addStamp:'הוספת חותמת', removeStamp:'הורדת חותמת', rename:'שם', renamePrompt:'השם החדש:', confirmRemove:'להוריד חותמת מהלקוח?',
    cancelLink:'ביטול', confirmCancel:'לבטל את הקישור?',
    viaLink:'מקישור', viaForm:'מהדף', stamps:'חותמות', noComment:'ללא הערה', empty:'אין כאן כלום כרגע.', search:'חיפוש לפי שם או מספר',
    setMin:'דירוג מינימלי לקבלת חותמת (1–5)', setHours:'תוקף קישור הדירוג בשעות', setLow:'דירוג נכנס למעקב אם הוא קטן או שווה ל',
    setEmail:'אימייל להתראות: דירוג נמוך, נעילת הלוח, שינוי קוד', save:'שמירת ההגדרות', saved:'נשמר ✓',
    qrHint:'הדפיסו את הקוד או שלחו אותו ללקוח.', close:'סגירה', confirmRedeem:'לאשר שהמתנה נמסרה?', rewardNow:'הלקוח זכה במתנה: ',
    demo:'מצב הדגמה: הנתונים נשמרים בדפדפן הזה בלבד.', demoCustomer:'הצטרפות', demoLink:'קישור דירוג', demoCard:'כרטיס לדוגמה', demoAdmin:'כניסה (ניהול: admin / 12345678 — לקוח: 0501234567 / 123456)', demoReset:'איפוס ההדגמה',
    err:{
      TOKEN_INVALID:'הקישור לא תקין. פתחו את הקישור המלא מהודעת הוואטסאפ.',
      TOKEN_EXPIRED:'תוקף הקישור פג. בקשו קישור חדש מטאבוני פרו.',
      TOKEN_USED:'הקישור הזה כבר נוצל.', NEED_NAME:'כתבו את השם כדי שנרשום את הכרטיס על שמכם.', NEED_CONSENT:'צריך לאשר את התנאי כדי להירשם.', NEED_GENDER:'בחרו זכר או נקבה.', BAD_BDAY:'תאריך הלידה לא תקין. בחרו יום וחודש.', EXISTS:'המספר הזה כבר רשום. חפשו אותו ברשימה.', BAD_REVIEW_URL:'קישור גוגל צריך להיות https ומגוגל (g.page, search.google.com או maps.app.goo.gl).', BAD_NAME:'השם יכול להכיל אותיות בלבד, בלי מספרים, סימנים או קישורים.', BAD_URL:'קישור דף הלקוח חסר או שגוי. בפרויקט Tabooni Public ← Deploy ← Manage deployments ← העתיקו את Web app URL (מסתיים ב-/exec) ← הדביקו כאן בהגדרות ← שמרו.', DEV_URL:'זה קישור בדיקה (/dev) שעובד רק לכם. קחו את הקישור מ-Manage deployments שמסתיים ב-/exec.', ADMIN_URL:'זה הקישור של לוח הניהול. צריך את הקישור של פרויקט Tabooni Public.', FORBIDDEN:'אין הרשאה.', BAD_RATING:'בחרו קודם מספר כוכבים.', NEED_COMMENT:'כתבו לנו כמה מילים לפני השליחה.',
      BAD_PHONE:'המספר צריך להיות 10 ספרות ולהתחיל ב-05.', WRONG_PIN:'קוד שגוי.', WEAK_PIN:'הקוד חלש: לפחות 6 תווים, בלי רצף או חזרה של אותה ספרה.', NO_SESSION:'החיבור פג. היכנסו מחדש.', RATE_LIMIT:'יש עומס כרגע. נסו שוב בעוד דקה.',
      TOO_SOON:'כבר קיבלנו דירוג מהמספר הזה והוא ממתין לאישור.',
      LOCKED:'יותר מדי ניסיונות. הלוח נעול ל-15 דקות.', CARD_NOT_FOUND:'לא מצאנו את הכרטיס. בדקו את הקישור.',
      NETWORK:'אין חיבור. בדקו את האינטרנט ונסו שוב.', SETUP_MISSING:'המערכת לא מוכנה: הריצו setup() ב-Apps Script.',
      DEFAULT:'משהו השתבש. נסו שוב.'
    }
  }
};

function store(k, v){ try{ if(v === undefined) return localStorage.getItem(k); if(v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); }catch(e){ return null; } }
function sstore(k, v){ try{ if(v === undefined) return sessionStorage.getItem(k); if(v === null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); }catch(e){ return null; } }
var LANG = store('tp_lang') === 'he' ? 'he' : 'ar';
function t(k){ return T[LANG][k] || k; }
function errText(code){ return T[LANG].err[code] || T[LANG].err.DEFAULT; }
function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function fmtDate(iso){ if(!iso) return ''; var d = new Date(iso); if(isNaN(d)) return ''; var z = function(n){ return (n < 10 ? '0' : '') + n; }; return z(d.getDate()) + '.' + z(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + z(d.getHours()) + ':' + z(d.getMinutes()); }
function normPhone(p){ var d = String(p || '').replace(/[\u0660-\u0669]/g, function(c){ return String(c.charCodeAt(0) - 0x660); }).replace(/[\u06F0-\u06F9]/g, function(c){ return String(c.charCodeAt(0) - 0x6F0); }).replace(/\D/g, ''); if(d.indexOf('972') === 0) d = '0' + d.slice(3); if(d.length === 9 && d.charAt(0) === '5') d = '0' + d; return d; }
function validName(n){ n = String(n || '').trim(); return /^[\p{L}\p{M}][\p{L}\p{M} '\u05F3\u05F4-]{0,39}$/u.test(n); }
// عدد الطبعات بصيغة صحيحة: طبعة / طبعتين / 3 طبعات
function stampsTxt(n){ n = Number(n) || 1; if(LANG === 'he') return n === 1 ? 'חותמת' : n + ' חותמות'; return n === 1 ? 'طبعة' : n === 2 ? 'طبعتين' : n + ' طبعات'; }
function stampsNewTxt(n){ n = Number(n) || 1; if(LANG === 'he') return n === 1 ? 'חותמת חדשה' : n + ' חותמות חדשות'; return n === 1 ? 'طبعة جديدة' : n === 2 ? 'طبعتين جداد' : n + ' طبعات جديدة'; }
function tq(k, n){ return t(k).replace('{stamps}', stampsTxt(n)).replace('{new}', stampsNewTxt(n)).replace('{n}', Number(n) || 1); }
// نص حسب الجنس: مفتاح + F للمؤنث (إذا موجود)، وإلا النص العادي
function tqg(k, n, g){ return tq((g === 'f' && T[LANG][k + 'F']) ? k + 'F' : k, n); }
// خانات الجنس وعيد الميلاد (للتسجيل وللإدارة)
function personFields(p, g, bday){
  var mo = (bday || '').split('-')[0] || '', dy = (bday || '').split('-')[1] || '', names = t('months').split('|'), i, o;
  var h = '<label>' + esc(t('genderQ')) + '</label><div class="seg" role="radiogroup">' +
    ['m','f'].map(function(v){ return '<label class="segb"><input type="radio" name="' + p + 'g" value="' + v + '"' + (g === v ? ' checked' : '') + '><span>' + esc(t(v === 'm' ? 'male' : 'female')) + '</span></label>'; }).join('') + '</div>' +
    '<label for="' + p + 'm">' + esc(t('bdayLabel')) + '</label><div class="bday"><select id="' + p + 'd" aria-label="' + esc(t('dayPh')) + '"><option value="">' + esc(t('dayPh')) + '</option>';
  for(i = 1; i <= 31; i++){ o = (i < 10 ? '0' : '') + i; h += '<option value="' + o + '"' + (o === dy ? ' selected' : '') + '>' + o + '</option>'; }
  h += '</select><select id="' + p + 'm" aria-label="' + esc(t('monthPh')) + '"><option value="">' + esc(t('monthPh')) + '</option>';
  for(i = 1; i <= 12; i++){ o = (i < 10 ? '0' : '') + i; h += '<option value="' + o + '"' + (o === mo ? ' selected' : '') + '>' + o + '</option>'; }
  return h + '</select></div><p class="sub hint" style="margin:6px 0 0">' + esc(t('bdayHint')) + '</p>';
}
function readPerson(p){
  var g = document.querySelector('input[name="' + p + 'g"]:checked'), d = document.getElementById(p + 'd').value, m = document.getElementById(p + 'm').value;
  return { gender: g ? g.value : '', bday: (d && m) ? m + '-' + d : '', partial: !!(d || m) && !(d && m) };
}
function fill(tpl, name){ var nm = String(name || ''); return String(tpl).replace('{name}', function(){ return nm; }).replace(/ {2,}/g, ' ').replace(/ ([،,؟?])/g, '$1'); }
// أيقونة محادثة (عامة) لأزرار واتساب
// أيقونة بطاقة
var CARD_ICO = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M2.5 9.5h19" stroke="currentColor" stroke-width="2.4"/><circle cx="7" cy="15" r="1.3" fill="currentColor"/><circle cx="10.5" cy="15" r="1.3" fill="currentColor"/></svg>';
var CHAT_ICO = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 3C7 3 3 6.6 3 11c0 2.2 1 4.2 2.7 5.6L5 21l4.3-2.1c.9.2 1.8.3 2.7.3 5 0 9-3.6 9-8s-4-8-9-8zm-3.5 9.2a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm3.5 0a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm3.5 0a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4z"/></svg>';
function waLink(phone, text){ return 'https://wa.me/972' + phone.slice(1) + '?text=' + encodeURIComponent(text); }

/* ---------- API: السيرفر الحقيقي أو وضع تجريبي ---------- */
// شريط تحميل رفيع فوق الصفحة طول ما في طلب للسيرفر
var PENDING = 0;
function busy(d){ PENDING = Math.max(0, PENDING + d); document.documentElement.classList.toggle('busy', PENDING > 0); }
function api(fn){
  var args = Array.prototype.slice.call(arguments, 1);
  busy(1);
  return new Promise(function(done){
    var finished = false, res = function(v){ if(finished) return; finished = true; busy(-1); done(v); };
    if(IS_LIVE){
      var to = setTimeout(function(){ res({ok:false, error:'NETWORK'}); }, 35000);
      sbCall(fn, args).then(function(j){ clearTimeout(to); res(j && typeof j === 'object' ? j : {ok:false, error:'NETWORK'}); },
                            function(){ clearTimeout(to); res({ok:false, error:'NETWORK'}); });
    } else if(IS_DEMO){
      setTimeout(function(){ res(Mock[fn] ? Mock[fn].apply(null, args) : {ok:false, error:'NOT_FOUND'}); }, 200);
    } else res({ok:false, error:'NO_API'});
  });
}

/* ---------- رسومات البيتسا ---------- */
var svgN = 0;
function pizzaSVG(on, boat){
  var g = 'g' + (++svgN);
  // طبعة مليانة = صورة بيتسا حقيقية، والقارب = صورة قارب حقيقية
  if(on && !boat) return '<img class="pz" src="' + PIZZA_SRC + '" alt="" aria-hidden="true" draggable="false">';
  if(on && boat) return '<img class="pz boat" src="' + BOAT_SRC + '" alt="" aria-hidden="true" draggable="false">';
  if(!on){
    return boat
      ? '<svg viewBox="0 0 100 100" aria-hidden="true"><path d="M8 50 Q50 14 92 50 Q50 86 8 50Z" fill="none" stroke="#5A4A3A" stroke-width="2.5" stroke-dasharray="5 4"/></svg>'
      : '<svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44" fill="rgba(255,255,255,.02)" stroke="#5A4A3A" stroke-width="2.5" stroke-dasharray="5 4"/><circle cx="50" cy="50" r="31" fill="none" stroke="#2E2A26" stroke-width="1.5"/></svg>';
  }
  var defs = '<defs><radialGradient id="' + g + '" cx="50%" cy="45%" r="55%"><stop offset="0" stop-color="#F1C27D"/><stop offset=".8" stop-color="#D98E3E"/><stop offset="1" stop-color="#9A5220"/></radialGradient></defs>';
  if(boat){
    return '<svg viewBox="0 0 100 100" aria-hidden="true">' + defs +
      '<path d="M6 50 Q50 12 94 50 Q50 88 6 50Z" fill="url(#' + g + ')"/><path d="M20 50 Q50 28 80 50 Q50 72 20 50Z" fill="#C62D22"/>' +
      '<circle cx="40" cy="47" r="6" fill="#FFF3DC"/><circle cx="57" cy="54" r="7" fill="#FFF3DC"/><circle cx="66" cy="45" r="4.5" fill="#FFF3DC"/>' +
      '<ellipse cx="49" cy="44" rx="5" ry="2.6" fill="#3F7D36" transform="rotate(-25 49 44)"/><ellipse cx="33" cy="54" rx="4.5" ry="2.3" fill="#3F7D36" transform="rotate(20 33 54)"/>' +
      '<circle cx="14" cy="47" r="1.8" fill="#3A1D0C"/><circle cx="86" cy="53" r="2" fill="#3A1D0C"/><circle cx="50" cy="21" r="1.6" fill="#3A1D0C"/><circle cx="46" cy="80" r="2" fill="#3A1D0C"/></svg>';
  }
  return '<svg viewBox="0 0 100 100" aria-hidden="true">' + defs +
    '<circle cx="50" cy="50" r="46" fill="url(#' + g + ')"/><circle cx="50" cy="50" r="33" fill="#C62D22"/>' +
    '<circle cx="38" cy="40" r="8" fill="#FFF3DC"/><circle cx="61" cy="38" r="7" fill="#FFF3DC"/><circle cx="55" cy="62" r="9" fill="#FFF3DC"/><circle cx="36" cy="61" r="6" fill="#FFF3DC"/>' +
    '<ellipse cx="50" cy="48" rx="7" ry="3.4" fill="#3F7D36" transform="rotate(-30 50 48)"/><ellipse cx="68" cy="52" rx="6" ry="3" fill="#3F7D36" transform="rotate(40 68 52)"/><ellipse cx="44" cy="27" rx="5.5" ry="2.8" fill="#3F7D36" transform="rotate(10 44 27)"/>' +
    '<circle cx="12" cy="44" r="2.4" fill="#3A1D0C"/><circle cx="84" cy="30" r="2.2" fill="#3A1D0C"/><circle cx="78" cy="80" r="2.6" fill="#3A1D0C"/><circle cx="28" cy="86" r="2" fill="#3A1D0C"/><circle cx="58" cy="7" r="2" fill="#3A1D0C"/></svg>';
}
function giftGlow(svg){ return svg.replace(/^<(svg|img) /, '<$1 style="filter:drop-shadow(0 0 8px rgba(242,104,44,.7))" '); }

/* ---------- أجزاء مشتركة ---------- */
function logoImg(size){ return '<img class="logo-img" src="' + LOGO_SRC + '" alt="' + esc(t('brand')) + '" width="' + size + '" height="' + size + '">'; }
// رأس الصفحة: الشعار بالنص
function header(extra){
  return '<header class="top"><div class="top-actions"><button class="lang" id="langBtn" type="button">' + esc(t('switchTo')) + '</button>' + (extra || '') + '</div>' + logoImg(176) + '</header>';
}
// رأس مصغّر للوحة الإدارة: شعار + عنوان + أزرار
function headerCompact(title, extra){
  return '<header class="top compact"><div class="brand-row">' + logoImg(84) + '<div><h1>' + esc(title) + '</h1><small>' + esc(t('brand')) + '</small></div></div>' +
    '<div class="top-actions">' + (extra || '') + '<button class="lang" id="langBtn" type="button">' + esc(t('switchTo')) + '</button></div></header>';
}
function demoBar(){
  if(!IS_DEMO) return '';
  return '<div class="demo">' + esc(t('demo')) + '<br>' +
    '<a href="' + CUSTOMER_URL + '?new=1">' + esc(t('demoCustomer')) + '</a>' +
    '<a href="' + CUSTOMER_URL + '?t=DEMO1">' + esc(t('demoLink')) + '</a>' +
    '<a href="' + CUSTOMER_URL + '?c=demoayman">' + esc(t('demoCard')) + '</a>' +
    '<a href="' + ADMIN_URL + '">' + esc(t('demoAdmin')) + '</a>' +
    '<a href="#" id="demoReset">' + esc(t('demoReset')) + '</a></div>';
}
function bindCommon(rerender){
  var lb = document.getElementById('langBtn');
  if(lb) lb.onclick = function(){ LANG = LANG === 'ar' ? 'he' : 'ar'; store('tp_lang', LANG); document.documentElement.lang = LANG; rerender(); };
  var dr = document.getElementById('demoReset');
  if(dr && IS_DEMO) dr.onclick = function(e){ e.preventDefault(); Mock.reset(); store('tp_card', null); location.reload(); };
}
function copyText(text, btn, ok){
  function done(){ if(ok) return ok(); var o = btn.innerHTML; btn.textContent = t('copied'); setTimeout(function(){ btn.innerHTML = o; }, 1500); }
  function fallback(){ var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try{ document.execCommand('copy'); done(); }catch(e){} ta.remove(); }
  if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
}
// QR بيتولّد داخل المتصفح. الرابط ما بينبعث لأي موقع خارجي
function qrHtml(url){
  try{
    if(typeof qrcode !== 'function') throw 0;
    var q = qrcode(0, 'M'); q.addData(url); q.make();
    return q.createImgTag(6, 12, 'QR');
  }catch(e){ return '<p class="sub" dir="ltr" style="word-break:break-all">' + esc(url) + '</p>'; }
}
function showQR(title, url){
  var dlg = document.getElementById('qr');
  dlg.innerHTML = '<h2>' + esc(title) + '</h2><div class="qrbox">' + qrHtml(url) + '</div><p class="sub" style="margin:12px 0">' + esc(t('qrHint')) + '</p><button class="btn small ghost" type="button" id="qc">' + esc(t('close')) + '</button>';
  document.getElementById('qc').onclick = function(){ dlg.close(); };
  if(dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
}
function starsInput(){
  return '<div class="stars" role="radiogroup">' + [1,2,3,4,5].map(function(n){ return '<button type="button" class="star" role="radio" aria-checked="false" aria-label="' + n + ' – ' + esc(t('r' + n)) + '" data-n="' + n + '">★</button>'; }).join('') +
    '</div><div class="rate-label" id="rateLabel" aria-live="polite"></div>';
}
function bindStars(state){
  function paint(){
    document.querySelectorAll('.star').forEach(function(b){ var n = +b.dataset.n; b.classList.toggle('on', n <= state.rating); b.setAttribute('aria-checked', n === state.rating ? 'true' : 'false'); });
    document.getElementById('rateLabel').textContent = state.rating ? t('r' + state.rating) : '';
    var gn = document.getElementById('gNext'); if(gn) gn.textContent = state.rating >= 4 ? t('googleNext') : '';
    var cl = document.querySelector('label[for="cm"]'), cmx = document.getElementById('cm'), sf = !state.rating ? '' : state.rating >= 4 ? 'Pos' : 'Neg';
    if(cl) cl.textContent = t('commentLabel' + sf); if(cmx) cmx.placeholder = t('commentPh' + sf);
  }
  document.querySelectorAll('.star').forEach(function(b){ b.onclick = function(){ state.rating = +b.dataset.n; paint(); var e = document.getElementById('err'); if(e) e.textContent = ''; }; });
  paint();
}
function getParams(){
  return new Promise(function(res){
    var o = {}; new URLSearchParams(location.search).forEach(function(v, k){ o[k] = v; }); res(o);
  });
}
document.documentElement.lang = LANG;

/* ---------- نصوص التطبيق الموحّد (دخول، كلمات سر، تثبيت) ---------- */
(function(){
  var ar = {
    nHome:'الرئيسية', nReports:'تقارير', nMore:'المزيد', custList:'آخر الزبائن', retry:'حاول مرة ثانية', loginTitle:'تسجيل الدخول', loginSub:'الزبائن: رقم التلفون وكلمة السر اللي وصلتكم على واتساب.',
    userLabel:'رقم التلفون', userPh:'05XXXXXXXX', passLabel:'كلمة السر', showPass:'إظهار', hidePass:'إخفاء',
    mfaTitle:'التحقق بخطوتين', mfaSub:'اكتب الكود (6 أرقام) من تطبيق المصادقة على تلفونك.', mfaSetupSub:'مرة وحدة بس: افتح Google Authenticator (أو Microsoft Authenticator) ← إضافة ← امسح الـQR. بعدين اكتب الكود اللي بيطلع.',
    tSignups:'تسجيلات جديدة', signupsHint:'زبائن سجّلوا لحالهم من التطبيق. الزبون الجديد بيشوف بطاقته من أول لحظة؛ الموافقة بتأكد إنه حقيقي (وبتصير لحالها لما تسجّله طلب).',
    approve:'موافقة', reject:'رفض', approveAll:'موافقة على الكل', noSignups:'ما في تسجيلات بتستنى موافقة.', newCust:'زبون جديد', existingCard:'رقم موجود عندك: {name} طبعات',
    claimHint:'هالرقم كان إله بطاقة. بس بعد موافقتك بيشوفها. تأكد إنه صاحب الرقم.', viewCard:'البطاقة', pendingPill:'بانتظار موافقة',
    confirmRejectNew:'رفض التسجيل وحذف {name}؟', confirmRejectClaim:'رفض التسجيل؟ الحساب الجديد بينحذف، والبطاقة الأصلية بتضل مثل ما هي.', confirmApproveAll:'موافقة على كل التسجيلات اللي بتستنى؟',
    f_all:'الكل', f_pending:'بانتظار موافقة', f_nologin:'بدون حساب', f_gift:'هدية جاهزة', f_near:'قريب من هدية', f_idle:'ما زار من شهر',
    haveAccount:'عندك حساب؟', waitTitle:'حسابك جاهز ✓', waitText:'بطاقتك وطبعاتك بتتجهّز وبتبيّن هون قريباً. ادخل كمان شوي.',
    rateLater:'بعدين، فرجيني بطاقتي', pendingTitle:'عندك طلب من اليوم', pendingText:'قيّمه بثواني وبتنضافلك {stamps} على بطاقتك.', pendingBtn:'قيّم طلبي',
    cardInApp:'بطاقتك صارت بالتطبيق: ادخل برقم تلفونك وكلمة السر اللي وصلتك.',
    mfaManual:'ما بتقدر تمسح؟ أضف الحساب يدوياً بهالمفتاح:', mfaCode:'الكود من التطبيق',
    loginBtn:'دخول', joinLink:'اشترك بطابوني برو VIP', forgotHint:'نسيت كلمة السر؟ اطلب كلمة سر جديدة من طابوني برو على واتساب.',
    hiName:'أهلاً', setPassTitle:'اختار كلمة سر خاصة فيك', setPassSub:'هاي أول مرة بتدخل. اختار كلمة سر جديدة بدل المؤقتة.',
    changePassTitle:'تغيير كلمة السر', curPass:'كلمة السر الحالية', tempPass:'كلمة السر المؤقتة (من الواتساب)', newPass:'كلمة سر (8 خانات على الأقل، أحرف وأرقام)',
    newPass2:'أعد كتابة كلمة السر الجديدة', savePass:'احفظ كلمة السر', passMismatch:'كلمتين السر مش متطابقات.', passSaved:'كلمة السر تغيّرت ✓',
    myAccount:'كلمة السر', signOut:'خروج', installApp:'ثبّت التطبيق', instTitle:'ثبّت تطبيق طابوني برو', instWhy:'بطاقتك وطبعاتك بكبسة وحدة من الشاشة الرئيسية، مثل أي تطبيق.', instLater:'مش هلأ', instOk:'تمام', instIos1:'اكبس على زر المشاركة (أو ⋯ وبعدين مشاركة)', instIos1c:'اكبس على زر المشاركة فوق جنب العنوان', instIos2:'اختار "إضافة إلى الشاشة الرئيسية"', instIos3:'اكبس "إضافة" فوق', instAnd1:'افتح قائمة المتصفح', instAnd2:'اختار "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية"', instInApp:'عشان تثبّت التطبيق، لازم تفتح الرابط بالمتصفح.', instInAppIos:'اكبس على القائمة ← "فتح في Safari"', instInAppAnd:'اكبس على القائمة ← "فتح في Chrome"', iosInstall:'لتثبيت التطبيق: اكبس مشاركة ثم "إضافة إلى الشاشة الرئيسية".',
    // الإدارة
    pin:'كلمة السر', publicUrl:'رابط التطبيق (بيتعبّى تلقائياً، لتحويل الروابط القديمة)', useThisUrl:'استعمل رابط التطبيق الحالي',
    securityTitle:'معلومات دخول الإدارة', securityHint:'تغيير كلمة السر بيطلّع كل الأجهزة الثانية. 8 خانات على الأقل (بنصح بـ 12+). الإيميل بيتغيّر من لوحة Supabase.',
    curPin:'كلمة السر الحالية', newUser:'اسم مستخدم جديد (اختياري)', newPin:'كلمة سر جديدة (8 خانات على الأقل)', changePin:'غيّر كلمة السر',
    pinChanged:'معلومات الدخول تغيّرت. ادخل من جديد.', currentUser:'إيميل الإدارة:',
    loginAccess:'دخول للتطبيق', loginOn:'دخول مفعّل', loginPending:'بانتظار أول دخول', makeLogin:'كلمة سر للدخول', resetLogin:'كلمة سر جديدة',
    disableLogin:'إيقاف الدخول', confirmDisableLogin:'إيقاف دخول هالزبون للتطبيق؟ البطاقة والطبعات بتضل.', confirmResetLogin:'كلمة سر جديدة؟ القديمة بتوقف وكل أجهزته بتطلع.',
    loginInfoTitle:'معلومات الدخول', loginInfoHint:'كلمة السر بتظهر هلأ بس. ابعثها للزبون على واتساب، وبأول دخول رح يختار كلمة سر خاصة فيه.',
    loginUser:'اسم المستخدم', loginPass:'كلمة السر المؤقتة', sendLoginWa:'ابعث معلومات الدخول', copyAll:'انسخ', lastLogin:'آخر دخول',
    loginMsg:'السلام عليكم، شو الأخبار {name}؟\nهاي معلومات الدخول لبطاقتك بطابوني برو VIP:\nاسم المستخدم: {user}\nكلمة السر المؤقتة: {pass}\nبأول دخول رح نطلب منك تختار كلمة سر خاصة فيك.\n{url}',
    loginMsgF:'السلام عليكم، شو الأخبار {name}؟\nهاي معلومات الدخول لبطاقتك بطابوني برو VIP:\nاسم المستخدم: {user}\nكلمة السر المؤقتة: {pass}\nبأول دخول رح نطلب منك تختاري كلمة سر خاصة فيكِ.\n{url}'
  };
  var he = {
    nHome:'ראשי', nReports:'דוחות', nMore:'עוד', custList:'לקוחות אחרונים', retry:'נסו שוב', loginTitle:'כניסה', loginSub:'לקוחות: מספר טלפון והסיסמה שקיבלתם בוואטסאפ.',
    userLabel:'מספר טלפון', userPh:'05XXXXXXXX', passLabel:'סיסמה', showPass:'הצג', hidePass:'הסתר',
    mfaTitle:'אימות דו-שלבי', mfaSub:'הקלידו את הקוד (6 ספרות) מאפליקציית האימות בטלפון.', mfaSetupSub:'פעם אחת בלבד: פתחו את Google Authenticator (או Microsoft Authenticator) ← הוספה ← סרקו את ה-QR. אחר כך הקלידו את הקוד שמופיע.',
    tSignups:'הרשמות חדשות', signupsHint:'לקוחות שנרשמו בעצמם באפליקציה. לקוח חדש רואה את הכרטיס מהרגע הראשון; האישור מוודא שהוא אמיתי (וקורה אוטומטית כשרושמים לו הזמנה).',
    approve:'אישור', reject:'דחייה', approveAll:'אישור הכל', noSignups:'אין הרשמות שממתינות לאישור.', newCust:'לקוח חדש', existingCard:'מספר קיים אצלכם: {name} חותמות',
    claimHint:'למספר הזה כבר היה כרטיס. רק אחרי האישור שלכם הוא יראה אותו. ודאו שזה בעל המספר.', viewCard:'הכרטיס', pendingPill:'ממתין לאישור',
    confirmRejectNew:'לדחות את ההרשמה ולמחוק את {name}?', confirmRejectClaim:'לדחות את ההרשמה? החשבון החדש יימחק, והכרטיס המקורי יישאר כמו שהוא.', confirmApproveAll:'לאשר את כל ההרשמות הממתינות?',
    f_all:'הכל', f_pending:'ממתינים לאישור', f_nologin:'בלי חשבון', f_gift:'מתנה מוכנה', f_near:'קרוב למתנה', f_idle:'לא ביקרו חודש',
    haveAccount:'יש לכם חשבון?', waitTitle:'החשבון מוכן ✓', waitText:'הכרטיס והחותמות שלכם בהכנה ויופיעו כאן בקרוב. היכנסו שוב עוד מעט.',
    rateLater:'אחר כך, תראו לי את הכרטיס', pendingTitle:'יש לך הזמנה מהיום', pendingText:'דרגו אותה בכמה שניות ותקבלו {stamps} בכרטיס.', pendingBtn:'לדרג את ההזמנה',
    cardInApp:'הכרטיס שלכם עבר לאפליקציה: היכנסו עם מספר הטלפון והסיסמה שקיבלתם.',
    mfaManual:'לא מצליחים לסרוק? הוסיפו ידנית עם המפתח:', mfaCode:'הקוד מהאפליקציה',
    loginBtn:'כניסה', joinLink:'הצטרפות לטאבוני פרו VIP', forgotHint:'שכחתם את הסיסמה? בקשו סיסמה חדשה מטאבוני פרו בוואטסאפ.',
    hiName:'שלום', setPassTitle:'בחרו סיסמה משלכם', setPassSub:'זו הכניסה הראשונה. בחרו סיסמה חדשה במקום הזמנית.',
    changePassTitle:'שינוי סיסמה', curPass:'הסיסמה הנוכחית', tempPass:'הסיסמה הזמנית (מהוואטסאפ)', newPass:'סיסמה (לפחות 8 תווים, אותיות וספרות)',
    newPass2:'הקלידו שוב את הסיסמה החדשה', savePass:'שמירת הסיסמה', passMismatch:'הסיסמאות לא תואמות.', passSaved:'הסיסמה שונתה ✓',
    myAccount:'סיסמה', signOut:'יציאה', installApp:'התקנת האפליקציה', instTitle:'התקינו את האפליקציה של טאבוני פרו', instWhy:'הכרטיס והחותמות בלחיצה אחת ממסך הבית, כמו כל אפליקציה.', instLater:'לא עכשיו', instOk:'הבנתי', instIos1:'לחצו על כפתור השיתוף (או ⋯ ואז שיתוף)', instIos1c:'לחצו על כפתור השיתוף למעלה ליד הכתובת', instIos2:'בחרו "הוסף למסך הבית"', instIos3:'לחצו "הוסף" למעלה', instAnd1:'פתחו את תפריט הדפדפן', instAnd2:'בחרו "התקנת אפליקציה" או "הוספה למסך הבית"', instInApp:'כדי להתקין, צריך לפתוח את הקישור בדפדפן.', instInAppIos:'לחצו על התפריט ← "פתיחה ב-Safari"', instInAppAnd:'לחצו על התפריט ← "פתיחה ב-Chrome"', iosInstall:'להתקנה: לחצו שיתוף ואז "הוסף למסך הבית".',
    pin:'סיסמה', publicUrl:'קישור האפליקציה (מתמלא אוטומטית, להפניית קישורים ישנים)', useThisUrl:'השתמשו בקישור הנוכחי',
    securityTitle:'פרטי כניסה לניהול', securityHint:'שינוי הסיסמה מנתק את כל שאר המכשירים. לפחות 8 תווים (מומלץ 12+). האימייל משתנה בלוח Supabase.',
    curPin:'הסיסמה הנוכחית', newUser:'שם משתמש חדש (לא חובה)', newPin:'סיסמה חדשה (לפחות 8 תווים)', changePin:'שינוי הסיסמה',
    pinChanged:'פרטי הכניסה שונו. היכנסו מחדש.', currentUser:'אימייל הניהול:',
    loginAccess:'כניסה לאפליקציה', loginOn:'כניסה פעילה', loginPending:'ממתין לכניסה ראשונה', makeLogin:'סיסמה לכניסה', resetLogin:'סיסמה חדשה',
    disableLogin:'ביטול כניסה', confirmDisableLogin:'לבטל את הכניסה של הלקוח לאפליקציה? הכרטיס והחותמות נשארים.', confirmResetLogin:'סיסמה חדשה? הישנה תפסיק לעבוד וכל המכשירים שלו יתנתקו.',
    loginInfoTitle:'פרטי כניסה', loginInfoHint:'הסיסמה מוצגת עכשיו בלבד. שלחו אותה ללקוח בוואטסאפ, ובכניסה הראשונה הוא יבחר סיסמה משלו.',
    loginUser:'שם משתמש', loginPass:'סיסמה זמנית', sendLoginWa:'שליחת פרטי הכניסה', copyAll:'העתקה', lastLogin:'כניסה אחרונה',
    loginMsg:'שלום, מה שלומך {name}?\nאלה פרטי הכניסה לכרטיס שלך בטאבוני פרו VIP:\nשם משתמש: {user}\nסיסמה זמנית: {pass}\nבכניסה הראשונה תתבקש לבחור סיסמה משלך.\n{url}',
    loginMsgF:'שלום, מה שלומך {name}?\nאלה פרטי הכניסה לכרטיס שלך בטאבוני פרו VIP:\nשם משתמש: {user}\nסיסמה זמנית: {pass}\nבכניסה הראשונה תתבקשי לבחור סיסמה משלך.\n{url}'
  };
  var arErr = { PHONE_TAKEN:'هالرقم إله حساب من قبل. ادخل من شاشة الدخول، وإذا نسيت كلمة السر احكي مع طابوني برو.', SIGNUP_CLOSED:'التسجيل مسكّر مؤقتاً. جرّب كمان شوي.', NOT_CONFIRMED:'الحساب مش مؤكد بـ Supabase (Auto Confirm).', AUTH_SETUP:'مشكلة بالاتصال بـ Supabase (تأكد من config.js).', NO_ROLE:'كلمة السر صح، بس الحساب مش مسجّل كإدارة ولا كزبون.', DB_SETUP:'كلمة السر صح، بس في مشكلة بالداتابيس (ملفات SQL). خبّر الدعم.', BAD_CODE:'الكود غلط أو انتهى. استنى الكود الجاي وجرّب.', TEMP_EXPIRED:'كلمة السر المؤقتة انتهت (صلاحيتها أسبوع). اطلب كلمة سر جديدة من طابوني برو.', NO_LOGIN:'هالحساب مش مربوط ببطاقة.', BAD_LOGIN:'رقم التلفون/اسم المستخدم أو كلمة السر غلط.', LOCKED:'محاولات كثيرة غلط. الدخول مقفول 15 دقيقة.', WRONG_PIN:'كلمة السر الحالية غلط.',
    WEAK_PASS:'كلمة السر ضعيفة: 8 خانات على الأقل، فيها أحرف وأرقام، ومش رقم التلفون، ومش كلمة سر شائعة.', SAME_PASS:'كلمة السر الجديدة لازم تكون غير القديمة.', WEAK_PIN:'كلمة السر ضعيفة: 8 خانات على الأقل، ومش أرقام متتالية أو مكررة.',
    BAD_USER:'اسم المستخدم لازم يبدأ بحرف إنجليزي (3-32 خانة: حروف، أرقام، . _ -).', NO_API:'التطبيق مش مربوط بالسيرفر: حط رابط Supabase والمفتاح العام بملف config.js.',
    NETWORK:'مشكلة اتصال. تأكد من الإنترنت وجرّب كمان مرة.', BAD_REQUEST:'طلب غلط.', NO_SESSION:'انتهت الجلسة. ادخل من جديد.', BAD_URL:'رابط التطبيق لازم يبدأ بـ https، ومش رابط Apps Script.' };
  var heErr = { PHONE_TAKEN:'למספר הזה כבר יש חשבון. היכנסו ממסך הכניסה, ואם שכחתם סיסמה פנו לטאבוני פרו.', SIGNUP_CLOSED:'ההרשמה סגורה זמנית. נסו שוב מאוחר יותר.', NOT_CONFIRMED:'החשבון לא מאומת ב-Supabase.', AUTH_SETUP:'בעיה בחיבור ל-Supabase (בדקו את config.js).', NO_ROLE:'הסיסמה נכונה, אבל החשבון לא רשום כניהול או כלקוח.', DB_SETUP:'הסיסמה נכונה, אבל יש בעיה במסד הנתונים.', BAD_CODE:'הקוד שגוי או שפג תוקפו. חכו לקוד הבא ונסו שוב.', TEMP_EXPIRED:'הסיסמה הזמנית פגה (תוקף שבוע). בקשו סיסמה חדשה מטאבוני פרו.', BAD_LOGIN:'מספר הטלפון/שם המשתמש או הסיסמה שגויים.', LOCKED:'יותר מדי ניסיונות שגויים. הכניסה נעולה ל-15 דקות.', WRONG_PIN:'הסיסמה הנוכחית שגויה.',
    WEAK_PASS:'סיסמה חלשה: לפחות 8 תווים, אותיות וספרות, לא מספר הטלפון ולא סיסמה נפוצה.', SAME_PASS:'הסיסמה החדשה צריכה להיות שונה מהישנה.', WEAK_PIN:'סיסמה חלשה: לפחות 8 תווים, בלי ספרות עוקבות או חוזרות.',
    BAD_USER:'שם המשתמש צריך להתחיל באות באנגלית (3-32 תווים: אותיות, ספרות, . _ -).', NO_API:'האפליקציה לא מחוברת לשרת: הזינו את קישור Supabase והמפתח הציבורי בקובץ config.js.',
    NETWORK:'בעיית תקשורת. בדקו את האינטרנט ונסו שוב.', BAD_REQUEST:'בקשה שגויה.', NO_SESSION:'החיבור פג. היכנסו מחדש.', BAD_URL:'קישור האפליקציה צריך להתחיל ב-https ולא להיות קישור Apps Script.' };
  Object.assign(T.ar, ar); Object.assign(T.he, he); Object.assign(T.ar.err, arErr); Object.assign(T.he.err, heErr);
})();
// {user} {pass} {url} برسالة الدخول
function fillLogin(tpl, name, user, pass, url){ return fill(tpl, name).replace('{user}', function(){ return user; }).replace('{pass}', function(){ return pass; }).replace('{url}', function(){ return url; }); }
