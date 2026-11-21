/**
 * Browser half of @abinadwan/dsh-plugins-suite.
 * Uses DSH's documented lazy-CJS module registration and Slot API.
 * Native slots, scoped Cordis lifetimes, and an anonymous read-only stable-release check.
 */
window.__ModuleLoader__.load({
  id: '@abinadwan/dsh-plugins-suite',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    // Arabic UI dictionaries adapted from SMSMy/dsh-arabic v0.4.6 (MIT).
    // Copyright (c) 2026 SMSMy. See THIRD_PARTY_NOTICES.md.
    // Language selection is never changed during installation.
    const ARABIC_UI_DICTIONARIES = {"agent-team":{"blocked":"محظور بسبب الاعتماديات","blockedBy":"محظور بواسطة","current":"المحادثة الحالية","empty":"لا توجد مهام مشتركة بعد. أنشئها من خلال المحادثة.","failure":"سجل فريق محفوظ غير صالح: {message}","loading":"جارٍ تحميل الفريق…","memberStatus.failed":"فشل","memberStatus.inactive":"غير نشط","memberStatus.provisioning":"قيد التهيئة","memberStatus.running":"قيد التشغيل","model":"الموديل","open":"فتح محادثة العضو","owner":"المالك","ready":"جاهز","roster":"الأعضاء","status.completed":"مكتمل","status.in_progress":"قيد التنفيذ","status.pending":"معلّق","task.collapse":"عرض أقل","task.expand":"عرض المزيد","tasks":"المهام المشتركة","trigger":"فريق الوكلاء","unavailable":"الفريق غير متاح","unowned":"بلا مالك","writeScopes":"نطاقات الكتابة"},"approval":{"allowOnce":"السماح مرة واحدة","detail.aria":"تفاصيل الموافقة","escalation":"الأداة {toolName} تطلب تنفيذًا بصلاحيات مرتفعة","reject":"رفض","waiting":"في انتظار الموافقة"},"chat":{"chat.deepDiving":"التفكير العميق جارٍ","chat.deepDivingFor":"⁦التفكير العميق جارٍ منذ {duration} ···⁩","chat.loadError":"فشل تحميل السجل: {message} ({code})","chat.loadOlder":"تحميل الأقدم","chat.loadingHistory":"جارٍ تحميل السجل…","chat.toBottom":"العودة إلى الأسفل","chat.turnNavigation.jump":"الانتقال إلى الدورة {turn}","chat.turnNavigation.jumpLoad":"تحميل الدورة {turn} والانتقال إليها","chat.turnNavigation.label":"التنقل بين الدورات","chat.turnNavigation.turn":"الدورة {turn}","clock.md":"{m}/{d}","clock.ymd":"{y}-{m}-{d}","command.done":"مكتمل","command.failed":"فشل الأمر","command.running":"قيد التشغيل…","command.title":"الأمر","duration.compactMinutes":"{minutes}د{seconds}ث","duration.compactSeconds":"{seconds}ث","duration.hourUnit":"س ","duration.milliseconds":"{milliseconds}م.ث","duration.minuteUnit":"د ","duration.secondUnit":"ث","fileOpen.title":"تعذّر فتح الملف","fileOpen.unknown":"تعذّر فتح هذا الملف","image.close":"إغلاق معاينة الصورة","image.dialog":"معاينة الصورة","image.failed":"معاينة الصورة غير متاحة","image.loading":"جارٍ تحميل الصورة…","image.open":"عرض الصورة كاملة","json.truncated":"… مقطوع، إجمالي {total} حرفًا","message.accountStopped":"أُوقفت المهمة","message.branch":"التفرّع إلى محادثة جديدة","message.branchUnavailable":"متاح فقط لآخر رسالة في دورة مكتملة","message.compaction":"تم ضغط السياق","message.compaction.commandTitle":"compact","message.compaction.completed":"تم ضغط {items} من عناصر السجل (~{tokens} توكن)","message.compaction.expand":"عرض ملخص الضغط","message.compaction.running":"جارٍ ضغط السياق…","message.compaction.unavailable":"ملخص الضغط غير متاح","message.context.catalog.more":"… {count} أخرى","message.context.catalog.replaced":"فهرس الاستبدال","message.context.instructions.added":"أُضيف","message.context.instructions.loaded":"حُمّل","message.context.instructions.removed":"أُزيل","message.context.instructions.updated":"حُدّث","message.context.recall.counts":"{retained} محتفظ بها · {omitted} محذوفة","message.context.recall.truncated":"مقطوع","message.context.relay.from":"من الجلسة {session}","message.context.snapshot.supersedes":"يلغي اللقطات السابقة","message.contextInjection":"حقن السياق","message.contextRecall":"استرجاع الجلسة","message.extraBlock":"كتلة محتوى إضافية","message.failure.accountSignInRequired":"سجّل الدخول إلى DeepSeek وتأكد من أن وجهة الطلب تدعم مصادقة الحساب.","message.failure.accountSignedOut":"توقف لأنك سجّلت الخروج من DeepSeek.","message.failure.auth":"مفتاح API غير صالح","message.failure.quota":"استُنفدت حصة الطلبات.","message.maxTokens":"تم بلوغ حد توكنات الإخراج","message.maxTokens.hint":"قُطع الرد؛ المخرجات السابقة محفوظة في المحادثة. أرسل \"continue\" ليواصل الموديل.","message.referenceSeparator":"، ","message.referenceSummary":"جلسة مُشار إليها · {labels}","message.retry.active":"إعادة محاولة طلب الموديل","message.retry.cancelled":"أُلغيت إعادة محاولة طلب الموديل","message.retry.delay":"تأخير إعادة المحاولة: ","message.retry.failure":"سبب الفشل: ","message.retry.scheduled":"في انتظار إعادة محاولة طلب الموديل","message.retry.started":"أُعيدت محاولة طلب الموديل","message.retry.status":"{label} ({retry}/{maximum}) · {seconds}ث","message.stepProcess.code":"جارٍ تشغيل الكود","message.stepProcess.comma":"، ","message.stepProcess.commands":"جارٍ تشغيل الأوامر","message.stepProcess.done.code":"تم تشغيل الكود","message.stepProcess.done.commands":"تم تشغيل الأوامر","message.stepProcess.done.edit":"تم تعديل الملفات","message.stepProcess.done.plan":"تم تحديث الخطة","message.stepProcess.done.questions":"طُرحت أسئلة","message.stepProcess.done.read":"تمت قراءة الملفات","message.stepProcess.done.readImage":"تمت قراءة الصور","message.stepProcess.done.search":"تم البحث في الكود","message.stepProcess.done.subagents":"تم تنسيق وكلاء فرعيين","message.stepProcess.done.thinking":"اكتمل التحليل","message.stepProcess.done.tools":"تم استدعاء الأدوات","message.stepProcess.done.webFetch":"تمت زيارة صفحات ويب","message.stepProcess.done.webSearch":"تم البحث في الويب","message.stepProcess.done.write":"تمت كتابة الملفات","message.stepProcess.edit":"جارٍ تعديل الملفات","message.stepProcess.joinTwo":"{first} و{second}","message.stepProcess.more":"{title}، إلخ.","message.stepProcess.plan":"جارٍ تحديث الخطة","message.stepProcess.prepare.code":"التحضير لتشغيل الكود","message.stepProcess.prepare.commands":"التحضير لتشغيل الأوامر","message.stepProcess.prepare.edit":"التحضير لتعديل الملفات","message.stepProcess.prepare.plan":"التحضير لتحديث الخطة","message.stepProcess.prepare.questions":"التحضير للأسئلة","message.stepProcess.prepare.read":"التحضير لقراءة الملفات","message.stepProcess.prepare.readImage":"التحضير لقراءة الصور","message.stepProcess.prepare.search":"التحضير للبحث في الكود","message.stepProcess.prepare.subagents":"التحضير لتنسيق الوكلاء الفرعيين","message.stepProcess.prepare.tools":"التحضير لاستدعاءات الأدوات","message.stepProcess.prepare.webFetch":"التحضير لزيارة صفحات الويب","message.stepProcess.prepare.webSearch":"التحضير للبحث في الويب","message.stepProcess.prepare.write":"التحضير لكتابة الملفات","message.stepProcess.questions":"في انتظار إجرائك","message.stepProcess.read":"جارٍ قراءة الملفات","message.stepProcess.readImage":"جارٍ قراءة الصور","message.stepProcess.search":"جارٍ البحث في الكود","message.stepProcess.sharedPrefix":"","message.stepProcess.subagents":"جارٍ تنسيق الوكلاء الفرعيين","message.stepProcess.thinking":"جارٍ تحليل الطلب","message.stepProcess.tools":"جارٍ استدعاء الأدوات","message.stepProcess.webFetch":"جارٍ زيارة صفحات الويب","message.stepProcess.webSearch":"جارٍ البحث في الويب","message.stepProcess.write":"جارٍ كتابة الملفات","message.stopped":"متوقف","message.systemPrompt":"موجّه النظام","message.systemPromptUpdate":"تحديث موجّه النظام","message.think":"تفكير","message.tokensPerSecond":"{tps} توكن/ث","message.toolAdded":"أُضيفت أداة: {name}","message.toolRemoved":"أُزيلت أداة: {name}","message.toolsAdded":"أُضيف: {names}","message.toolsAddedCount":"{count} مُضافة","message.toolsChanged":"{added} مُضافة، {removed} مُزالة","message.toolsRemoved":"أُزيل: {names}","message.toolsRemovedCount":"{count} مُزالة","message.toolsUpdated":"تم تحديث الأدوات","message.trigger.agent":"وردت رسالة مهمة","message.trigger.explanation":"هذا الإشعار هو ما أطلق هذا الرد.","message.trigger.github":"ورد حدث GitHub","message.trigger.goal":"متابعة الهدف","message.trigger.job":"تم تحديث مهمة خلفية","message.trigger.plugin":"تم تحديث حالة البلاقن","message.trigger.request":"طُلب التنفيذ","message.trigger.schedule":"مهمة أتمتة","message.trigger.subagent":"تم تحديث حالة مهمة فرعية","message.trigger.team":"وردت رسالة فريق","message.trigger.webhook":"ورد حدث خارجي","message.turnError":"فشلت هذه الدورة","message.turnProcess.failed":"فشل","message.turnProcess.messages.one":"{count} رسالة","message.turnProcess.messages.other":"{count} رسائل","message.turnProcess.separator":" · ","message.turnProcess.subagents.one":"{count} وكيل فرعي","message.turnProcess.subagents.other":"{count} وكلاء فرعيون","message.turnProcess.thoughtForAWhile":"فكّر لبعض الوقت","message.turnProcess.took":"اكتمل في ","message.turnProcess.toolCalls.one":"{count} استدعاء أداة","message.turnProcess.toolCalls.other":"{count} استدعاءات أدوات","message.turnProcess.worked":"مكتمل","message.turnUsage.cacheHit":"إصابة الكاش","message.turnUsage.cacheRead":"إدخال من الكاش","message.turnUsage.cacheWrite":"كتابة في الكاش","message.turnUsage.consumed":"الاستخدام {total}","message.turnUsage.count":"{count} توكن","message.turnUsage.input":"إدخال غير مخزّن","message.turnUsage.model":"المزوّد / الموديل","message.turnUsage.output":"الإخراج","message.turnUsage.reasoning":" ({tokens} استدلال)","message.turnUsage.title":"استخدام الدورة","message.unknownBlock":"كتلة محتوى غير معروفة","message.unknownSurface":"حدث سطح غير معروف: {type}","number.groupSeparator":",","row.failed":"فشل","row.running":"قيد التشغيل","settings.collapse.completion":"عند اكتمال الرد","settings.collapse.description":"اختر متى تُطوى تفاصيل العمل تلقائيًا","settings.collapse.nextInput":"عند وصول الرسالة التالية","settings.collapse.title":"متى تُطوى تفاصيل العمل","settings.links.description":"اختر مكان فتح روابط الويب","settings.links.newTab":"المتصفح الافتراضي","settings.links.sidebar":"الشريط الجانبي داخل التطبيق","settings.links.title":"فتح روابط المحادثة في","settings.performance.compact":"مختصر","settings.performance.description":"اختر مقدار معلومات الأداء والاستخدام المعروضة","settings.performance.detailed":"مفصّل","settings.performance.title":"الأداء والاستخدام","settings.transcript.compact":"مختصر","settings.transcript.description":"اختر مقدار التفاصيل المعروضة لاستدعاءات الأدوات","settings.transcript.detailed":"مفصّل","settings.transcript.standard":"قياسي","settings.transcript.title":"تفاصيل العمل","settings.transcript.verbose":"مطوّل","stats.cacheHit":"إصابة الذاكرة المؤقتة {percent}%","stats.counts":"{turns} دورة {steps} خطوة","stats.dialog.llmTime":"زمن LLM","stats.dialog.speed":"التوكنات في الثانية (TPS)","stats.dialog.title":"إحصاءات الجلسة","stats.dialog.toolTime":"زمن الأدوات","stats.dialog.ttft":"متوسط زمن أول توكن (TTFT)","stats.dialog.usageTitle":"استخدام التوكنات","view.chat":"محادثة"},"claude-code-mods":{"band":"تعديلات Claude Code","press.failed":"فشل الزر: {message}","press.stale":"هذا الزر كان يخص عرضًا سابقًا؛ حُدّث الشريط","pressing":"جارٍ العمل…"},"command":{"description.compact":"ضغط سجل المحادثة الأقدم","description.export":"تنزيل سجل هذه الجلسة كأرشيف ZIP","description.feedback":"تسجيل ملاحظات حول هذه الجلسة","description.goal":"تحديد هدف مهمة طويلة الأمد أو عرضه","description.permission":"تبديل إعداد الصلاحيات المسبق (وضع البيئة المعزولة + سياسة الموافقة)","description.plan":"الدخول إلى وضع الخطة أو الخروج منه","label.compact":"ضغط","label.export":"تصدير","label.feedback":"ملاحظات","label.goal":"هدف","label.permission":"صلاحية","label.plan":"خطة","listbox.aria":"نتائج /{command}","notice.attachmentsUnsupported":"/{command} لا يقبل المرفقات؛ أزلها أولًا","overlay.aria":"خيارات /{command}","search.aria":"تصفية الخيارات","search.placeholder":"بحث…","section.add":"إضافة","section.commands":"الأوامر","status.applying":"جارٍ التطبيق…","status.empty":"لا خيارات","status.loading":"جارٍ تحميل الخيارات…","token.compact":"compact","token.export":"export","token.feedback":"feedback","token.goal":"goal","token.permission":"permission","token.plan":"plan"},"common":{"back":"رجوع","brand.localBuild":"نسخة DSH المحلية","cancel":"إلغاء","close":"إغلاق","codeBlock.title":"كتلة كود","codeBlock.unwrap":"عدم لف الأسطر","codeBlock.wrap":"لف الأسطر","collapse":"طيّ","copied":"تم النسخ","copy":"نسخ","copy.compactJson":"نسخ JSON المضغوط","copy.failed":"فشل النسخ","copy.json":"نسخ JSON","copy.optionsHint":"{action}؛ انقر بزر الفأرة الأيمن لخيارات النسخ","copy.path":"نسخ مسار الخاصية","copy.prettyJson":"نسخ JSON المنسّق","copy.value":"نسخ القيمة","delete":"حذف","edit":"تعديل","expand":"توسيع","json.label":"JSON","language.title":"اللغة","load.failed":"فشل التحميل","loading":"جارٍ التحميل…","markdown.footnotes":"الحواشي","markdown.truncatedCharacters":"… تم الاقتطاع عند {total} حرفًا","more":"المزيد","next":"التالي","none":"لا شيء","number.million":"{value}M","number.thousand":"{value}K","ok":"موافق","previous":"السابق","retry":"إعادة المحاولة","save":"حفظ","search":"بحث","skip":"تخطٍّ","submit":"إرسال","submitting":"جارٍ الإرسال…","truncated":"مقطوع","unknown":"غير معروف","workspace.defaultName":"مساحة العمل الافتراضية"},"conversation":{"ask.answered":"{answered}/{total} تمت الإجابة","ask.cancelled":"ملغاة","ask.cancelledDetail":"أُلغيت هذه المجموعة من الأسئلة قبل إرسال الإجابات.","ask.closed":"مغلقة","ask.closedDetail":"هذا السؤال مغلق؛ نتيجته في المحادثة أدناه.","ask.interrupted":"مقاطعة","ask.interruptedDetail":"قُوطعت هذه المجموعة من الأسئلة قبل إرسال الإجابات.","ask.pending":"متابَعة؛ الإجابة لا تزال متاحة","ask.pendingDetail":"لا يزال بالإمكان الإجابة عن هذه الأسئلة المعلّقة من مربع الكتابة.","ask.reopen":"الإجابة","ask.review":"عرض الإجابات","ask.rowTitle":"طرح سؤال","ask.skipped":"بلا إجابة","ask.waiting":"في الانتظار","attachment.directoryDesktopOnly":"لا يمكن إضافة المجلدات إلا في تطبيق سطح المكتب؛ أضف الملفات فرادى في المتصفح","attachment.dropBlocked":"لا يمكن إضافة الملفات والصور الآن","attachment.dropDesc":"حد الصور: حتى {count} صورة، بحجم {size} لكل صورة","attachment.dropTitle":"اسحب الملفات أو الصور هنا لإضافتها","attachment.pathUnavailable":"تعذّر الحصول على مسار المجلد؛ اسحبه مرة أخرى","attachment.pathUnsupported":"يحتوي المسار على أحرف لا يمكن للإشارة حملها؛ أعد تسميته وحاول مجددًا","attachment.pending":"المرفقات المعلّقة","attachment.scrollLeft":"تمرير المرفقات لليسار","attachment.scrollRight":"تمرير المرفقات لليمين","bash.failed":"فشل","bash.running":"قيد التشغيل","bash.stopped":"متوقف","command.attachmentsUnsupported":"/{command} لا يقبل المرفقات؛ أزلها أولًا","context.aria":"{percent} من السياق مستخدم","context.messages":"الرسائل","context.system":"موجّه النظام","context.tools":"تعريفات الأدوات","context.used":"من السياق مستخدم","detail.agent.reply":"رد الوكيل","detail.agents.count":"{count} وكيل","detail.days":"{count} يوم","detail.empty":"لا نتائج","detail.event.neighbors":"الأحداث المحيطة","detail.field.agent":"معرّف الوكيل","detail.field.agents":"الوكلاء المُشغَّلون","detail.field.availability":"التوفر","detail.field.bestMatch":"أفضل تطابق","detail.field.callId":"معرّف الاستدعاء","detail.field.content":"المحتوى","detail.field.context":"السياق","detail.field.currentPackage":"الحزمة الحالية","detail.field.data":"البيانات","detail.field.dependencies":"الاعتماديات","detail.field.depth":"العمق","detail.field.diagnostics":"التشخيصات","detail.field.exitCode":"رمز الخروج","detail.field.id":"المعرّف","detail.field.inputSchema":"مخطط الإدخال","detail.field.job":"معرّف المهمة","detail.field.latestRun":"آخر تشغيل","detail.field.message":"الرسالة","detail.field.messageId":"معرّف الرسالة","detail.field.methods":"الطرق","detail.field.model":"الموديل","detail.field.nextPackage":"الحزمة التالية","detail.field.outputSchema":"مخطط الإخراج","detail.field.owner":"المالك","detail.field.packages":"الحزم","detail.field.parent":"الأصل","detail.field.pid":"معرّف العملية","detail.field.platform":"المنصة","detail.field.previousStatus":"الحالة السابقة","detail.field.processGroup":"مجموعة العمليات","detail.field.props":"الخصائص","detail.field.provider":"المزوّد","detail.field.ready":"جاهز","detail.field.registrations":"التسجيلات","detail.field.result":"النتيجة","detail.field.revision":"المراجعة","detail.field.role":"الدور","detail.field.root":"الجذر","detail.field.seq":"تسلسل الأحداث","detail.field.signal":"الإشارة","detail.field.source":"المصدر","detail.field.step":"الخطوة","detail.field.surface":"حالة السجل","detail.field.target":"الحدث الهدف","detail.field.task":"المهمة","detail.field.time":"الوقت","detail.field.turn":"الدورة","detail.field.type":"النوع","detail.field.warnings":"التحذيرات","detail.field.writeScopes":"نطاقات الكتابة","detail.goal.active":"نشط","detail.goal.blocked":"محظور","detail.goal.complete":"مكتمل","detail.goal.disarmed":"في انتظار المتابعة","detail.goal.empty":"لا هدف","detail.goal.paused":"متوقف مؤقتًا","detail.goal.reason":"العائق","detail.goal.rounds":"الجولات","detail.hours":"{count} س","detail.jobs.count":"{count} مهمة خلفية","detail.location":"السطر {line}، العمود {column}","detail.locations.count":"{count} موضع","detail.matches.capped":"تم بلوغ حد النتائج؛ ضيّق البحث للحصول على المزيد","detail.matches.count":"{count} تطابق","detail.minutes":"{count} د","detail.models.title":"الموديلات المتاحة","detail.moreInInspect":"{count} عنصرًا إضافيًا متاح في Inspect","detail.no":"لا","detail.none":"لا شيء","detail.output.lines":"الأسطر {begin}–{end} من {total}","detail.output.truncated":"الإخراج مقطوع","detail.plugins.count":"{count} بلاقن ديناميكي","detail.providers.count":"{count} مزوّد inspect","detail.ralph.limit":"تم بلوغ حد الجولات","detail.ralph.reportedBlocker":"أبلغ العامل عن عائق","detail.ralph.reportedComplete":"أبلغ العامل عن الإنجاز","detail.receipt.alreadyFinished":"منتهٍ بالفعل","detail.receipt.cancel":"طُلب الإلغاء","detail.receipt.closed":"مغلق","detail.receipt.closing":"جارٍ الإغلاق","detail.receipt.delivered":"تم تسليم الرسالة","detail.receipt.interrupt":"طُلب المقاطعة","detail.receipt.signal":"تم تسليم الإشارة","detail.receipt.started":"بدأ","detail.recordedResult":"النتيجة المسجّلة","detail.report.nextSteps":"العمل المتبقي","detail.schedule.count":"{count} تذكير","detail.schedule.cron":"Cron {expression} ({zone})","detail.schedule.daily":"كل يوم في {time} ({zone})","detail.schedule.deleted":"محذوف","detail.schedule.empty":"لا تذكيرات","detail.schedule.every":"كل {interval}","detail.schedule.frequency":"التكرار","detail.schedule.once":"مرة واحدة","detail.schedule.overdue":"متأخر، في انتظار استئناف الجلسة","detail.schedule.scheduled":"مجدول","detail.schedule.weekly":"أسبوعيًا في {days} عند {time} ({zone})","detail.schedule.when":"مجدول في","detail.seconds":"{count} ث","detail.state":"الحالة","detail.status.accepted":"مقبول","detail.status.completed":"مكتمل","detail.status.deleted":"محذوف","detail.status.exited":"خرج","detail.status.failed":"فشل","detail.status.idle":"خامل","detail.status.inactive":"غير نشط","detail.status.killed":"ملغى","detail.status.provisioning":"قيد التهيئة","detail.status.queued":"في قائمة الانتظار","detail.status.ready":"جاهز","detail.status.running":"قيد التشغيل","detail.tasks.count":"{count} مهمة فريق","detail.tasks.nextPage":"توجد مهام إضافية؛ المؤشر التالي هو {cursor}","detail.terminals.count":"{count} طرفية","detail.todo.completed":"مكتمل","detail.todo.empty":"قائمة المهام فارغة","detail.todo.in_progress":"قيد التنفيذ","detail.todo.pending":"معلّق","detail.trace.ancestors":"الجلسات الأصل","detail.trace.derived":"الأحداث المشتقة","detail.trace.descendants":"الجلسات الفرعية","detail.trace.replacedBy":"مستبدل بـ","detail.trace.replacementChain":"سلسلة الاستبدال","detail.trace.replaces":"الأحداث المستبدلة","detail.trace.sources":"الأحداث المصدر","detail.wait.changed":"تم رصد تغيير","detail.wait.noProgress":"لا وكلاء فرعيون نشطون","detail.wait.timeout":"انتهت مهلة الانتظار","detail.wait.title":"نشاط الوكلاء الفرعيين","detail.weekday.1":"الاثنين","detail.weekday.2":"الثلاثاء","detail.weekday.3":"الأربعاء","detail.weekday.4":"الخميس","detail.weekday.5":"الجمعة","detail.weekday.6":"السبت","detail.weekday.7":"الأحد","detail.weekday.join":"، ","detail.workflow.script":"نص سير العمل","detail.yes":"نعم","details.running":"قيد التشغيل…","diff.collapseAria":"طيّ الفروقات","diff.expandAria":"توسيع {count} سطر فروقات إضافي","diff.expandRest":"… {count} سطر إضافي","error.sessionInUse":"هذه الجلسة قيد الاستخدام بالفعل، ربما بواسطة نسخة DSH أخرى قيد التشغيل (مثل dsh web أو تطبيق سطح المكتب). أغلق نسخ DSH الأخرى قيد التشغيل وحاول مجددًا.","file.label":"ملف","file.notStaged":"لم يكتمل رفع الملف؛ أعد إضافته وحاول مجددًا","file.pending":"الملفات المعلّقة","file.remove":"إزالة الملف {name}","file.retry":"إعادة محاولة رفع {name}","file.sessionUnavailable":"الجلسة غير متاحة؛ لا يمكن رفع الملفات","file.stillUploading":"لا تزال الملفات قيد الرفع؛ أرسل بعد انتهائها","file.uploadFailed":"فشل الرفع؛ انقر لإعادة المحاولة","file.uploading":"جارٍ الرفع…","hero.chooseWorkspace":"اختر مساحة العمل","hero.headline":"إلى المجهول","hero.preview":"معاينة","hint.goal":"صف هدف مهمة طويلة الأمد","hint.goal.active":"الهدف نشط — تعديل / إيقاف مؤقت / متابعة / مسح","hint.plan":"صف مهمتك لإنشاء خطة","image.closePreview":"إغلاق معاينة الصورة الأصلية","image.dimensionTooLarge":"يجب ألا يتجاوز بُعدا الصورة {size}px؛ صغّرها وحاول مجددًا","image.fileTooLarge":"يجب أن تكون كل صورة أصغر من {size}","image.label":"صورة","image.loadFailed":"فشل تحميل الصورة؛ انقر لإعادة المحاولة","image.loading":"جارٍ تحميل الصورة…","image.modelUnsupported":"الموديل الحالي لا يدعم الصور؛ بدّل إلى موديل يدعمها","image.openOriginal":"عرض الأصل","image.openOriginalLabel":"{label}، انقر لعرض الأصل","image.original":"الصورة الأصلية","image.pending":"الصور المعلّقة","image.preview":"معاينة الصورة الأصلية","image.remove":"إزالة الصورة {name}","image.sendFailed":"فشل إرسال الصور ({reason})؛ أعد إضافتها وحاول مجددًا","image.tooMany":"يمكن أن تتضمن الرسالة حتى {count} صورة","image.tooManyPixels":"دقة الصورة مرتفعة جدًا؛ اضغطها وحاول مجددًا","image.totalTooLarge":"تتجاوز الصور {size} إجمالًا؛ أزل بعضها وحاول مجددًا","image.unsupportedType":"الصور المدعومة هي PNG وJPG وWebP وGIF فقط","input.commands":"أضف ملفات أو نفّذ أوامر","input.file":"ملف","input.send":"إرسال رسالة","input.send.queue":"إدراج الرسالة في قائمة الانتظار","input.send.steer":"توجيه الرسالة","input.stop":"إيقاف التوليد","placeholder.default":"اكتب رسالة أو نفّذ مهمة، / للأوامر، @ للملفات أو الجلسات","placeholder.hero":"صف ما تريد بناءه، / للأوامر، @ للملفات أو الجلسات","placeholder.parentOffline":"الجلسة الأصل غير متصلة؛ الإرسال غير متاح لكن يمكنك إيقاف التشغيل","placeholder.plan":"صف مهمتك لإنشاء خطة","placeholder.steerQueue":"Cmd/Ctrl+Enter يوجّه جميع الرسائل في قائمة الانتظار","placeholder.unavailable":"الجلسة غير متاحة","placeholder.workspace":"اختر مساحة عمل للبدء","queue.cancelEdit":"إلغاء التعديل","queue.count":"{n} رسالة في قائمة الانتظار","queue.edit":"تعديل رسالة في قائمة الانتظار","queue.edit.unsupported":"يحتوي على محتوى غير نصي؛ التعديل غير مدعوم بعد","queue.editFailed":"فشل التعديل: ربما بدأ إرسال هذه الرسالة بالفعل.","queue.file":"الملف {name} في قائمة الانتظار","queue.image":"صورة رسالة في قائمة الانتظار","queue.remove":"إزالة رسالة من قائمة الانتظار","queue.removeFailed":"فشلت الإزالة: ربما بدأ إرسال هذه الرسالة بالفعل.","queue.save":"حفظ رسالة في قائمة الانتظار","queue.sending":"جارٍ الإرسال…","queue.steer":"توجيه رسالة في قائمة الانتظار","queue.steer.unavailable":"التوجيه متاح فقط أثناء تشغيل الوكيل","queue.steerFailed":"فشل التوجيه. حاول مجددًا.","read.collapseAria":"طيّ المحتوى","read.expandAria":"توسيع {count} سطر إضافي","read.expandRest":"… {count} سطر إضافي","read.window":"عرض {shown} من {total} سطر","row.commandArguments":"وسائط الأمر","row.failed":"فشل","row.input":"إدخال","row.inspect":"فحص","row.output":"إخراج","row.preparing":"التحضير لاستدعاء أداة","row.running":"قيد التشغيل","row.stopped":"متوقف","search.collapseAria":"طيّ النتائج","search.expandAria":"توسيع {count} سطر نتائج إضافي","search.expandRest":"… {count} سطر إضافي","search.matches":"{shown} تطابق · {files} ملف","search.matches.truncated":"عرض {shown} من {total} تطابق · {files} ملف","search.noResults":"لا نتائج","search.paths":"{shown} مسار","search.paths.truncated":"عرض {shown} من {total} مسار","session.hierarchy":"التسلسل الهرمي للجلسات","settings.enter.description":"ما يفعله Enter وزر الإرسال أثناء تشغيل الوكيل؛ Cmd/Ctrl+Enter يستخدم السلوك الآخر","settings.enter.queue":"قائمة الانتظار","settings.enter.steer":"توجيه","settings.enter.title":"سلوك الإرسال أثناء الانشغال","shortcut.complementary":"استخدم إجراء قائمة الانتظار / التوجيه المكمّل","shortcut.mention":"فتح قائمة الإشارات","shortcut.newline":"سطر جديد","shortcut.slash":"فتح قائمة الأوامر","terminal.collapseAria":"طيّ الإخراج","terminal.commandLine":"سطر الأوامر {n}","terminal.done":"تم","terminal.exitCode":"رمز الخروج {code}","terminal.expandAria":"توسيع {n} سطر الإخراج المتبقية","terminal.expandRest":"… {n} سطرًا إضافيًا","terminal.failed":"فشل","terminal.noExitCode":"لا رمز خروج","terminal.noOutput":"لا إخراج","terminal.running":"قيد التشغيل","terminal.sendInput":"(إرسال إدخال)","terminal.session":"الطرفية {sessionId}","terminal.signal":"الإشارة {signal}","todo.completed":"{done}/{total} مكتمل","todo.diff.added":"{count} مُضاف","todo.diff.addedItem":"مُضاف","todo.diff.compare":"التغييرات منذ القائمة السابقة","todo.diff.initial":"القائمة الأولية","todo.diff.movedItem":"أُعيد ترتيبه","todo.diff.noChanges":"لا تغييرات في القائمة","todo.diff.removed":"{count} مُزال","todo.diff.removedItem":"مُزال","todo.diff.unavailable":"القائمة السابقة غير متاحة","todo.diff.unchanged":"{count} دون تغيير","todo.diff.updated":"{count} مُحدّث","todo.diff.updatedItem":"تغيّرت الحالة","todo.progress.active":"{active} قيد التنفيذ","todo.progress.done":"{done} مكتمل","todo.progress.pending":"{pending} معلّق","todo.rowTitle":"تحديث قائمة المهام","todo.status.completed":"مكتمل","todo.status.inProgress":"قيد التنفيذ","todo.status.pending":"معلّق","todo.title":"المهام","tool.autoReviewNotExecuted":"لم تُنفّذ الأداة. السبب: {reason}","tool.autoReviewReasonFallback":"لم تأذن المراجعة التلقائية بهذا الإجراء","tool.autoReviewRejected":"رفضتها المراجعة التلقائية","tool.preparing.content":"{kilobytes}KB","tool.title.bash":"Bash","tool.title.closeTerminal":"إغلاق الطرفية","tool.title.code":"كود","tool.title.createGoal":"إنشاء هدف","tool.title.createSchedule":"إنشاء تذكير","tool.title.createTeamTask":"إنشاء مهمة فريق","tool.title.deleteSchedule":"حذف تذكير","tool.title.edit":"تعديل","tool.title.findDefinition":"إيجاد تعريف","tool.title.findImplementation":"إيجاد تنفيذ","tool.title.findReferences":"إيجاد مراجع","tool.title.generic":"استدعاء أداة","tool.title.getGoal":"عرض الهدف","tool.title.getTeamTask":"قراءة مهمة فريق","tool.title.glob":"Glob","tool.title.grep":"Grep","tool.title.hoverSymbol":"فحص الرمز","tool.title.inspect":"استعلام بيئة Cordis","tool.title.inspectPlugins":"فحص البلاقن","tool.title.inspectProviders":"فحص المزوّدين","tool.title.interruptAgent":"مقاطعة الوكيل","tool.title.killJob":"إلغاء مهمة خلفية","tool.title.listAgents":"عرض الوكلاء الفرعيين","tool.title.listJobs":"عرض المهام الخلفية","tool.title.listModels":"عرض الموديلات","tool.title.listSchedules":"عرض التذكيرات","tool.title.listTeamTasks":"عرض مهام الفريق","tool.title.listTerminals":"عرض الطرفيات","tool.title.lsp":"استعلام رموز الكود","tool.title.openTerminal":"فتح الطرفية","tool.title.pwsh":"Pwsh","tool.title.queryRuntime":"استعلام بيئة التشغيل","tool.title.ralph":"تشغيل حلقة ralph","tool.title.read":"قراءة","tool.title.readEvent":"قراءة حدث","tool.title.readImage":"قراءة صورة","tool.title.readJob":"قراءة مخرجات المهمة","tool.title.readTerminal":"قراءة الطرفية","tool.title.removeCordis":"إزالة بلاقن Cordis","tool.title.runCordis":"تشغيل بلاقن Cordis","tool.title.search":"بحث","tool.title.searchEvents":"بحث في الأحداث","tool.title.searchSessions":"بحث في الجلسات","tool.title.sendMessage":"إرسال رسالة","tool.title.signalTerminal":"إرسال إشارة إلى الطرفية","tool.title.spawnTeammate":"إنشاء زميل فريق","tool.title.stopCordis":"إيقاف بلاقن Cordis","tool.title.subagent":"إنشاء وكيل فرعي","tool.title.traceEvent":"تتبع حدث","tool.title.traceSession":"تتبع جلسة","tool.title.updateGoal":"تحديث الهدف","tool.title.updateSchedule":"تحديث تذكير","tool.title.updateTeamTask":"تحديث مهمة فريق","tool.title.waitAgent":"انتظار وكيل فرعي","tool.title.webFetch":"جلب","tool.title.webSearch":"بحث","tool.title.workflow":"تشغيل سير عمل","tool.title.write":"كتابة","web.contentTruncated":"تم اقتطاع المحتوى","web.http":"HTTP","web.noResults":"لا توجد نتائج","web.sourcesTruncated":"تم اقتطاع قائمة المصادر"},"cordis":{"a11y.defining":"جارٍ تعريف البلاقن","a11y.failed":"فشل التعريف","a11y.preparing":"جارٍ تحضير استدعاء أداة Cordis","a11y.stopped":"تمت مقاطعة التعريف","action.approve":"السماح","action.approveOnce":"السماح بهذا الإصدار فقط","action.approvePlugin":"السماح بالإصدارات المستقبلية لهذا البلاقن","action.decline":"رفض","action.inspect":"فحص","action.remove":"إزالة","action.retry":"إعادة المحاولة","action.rollback":"تراجع","action.run":"تشغيل","action.stop":"إيقاف","body.clientCode":"العميل","body.copied":"تم النسخ","body.copy":"نسخ","body.hostCode":"المضيف","body.output":"النتيجة","body.source":"مصدر البلاقن","panel.approvals.aria":"موافقات Cordis","panel.current":"الحالي: {packageId}","panel.empty":"لم يتم تعريف أي بلاقن بعد","panel.group.current":"هذه الجلسة","panel.group.others":"جلسات أخرى","panel.hint":"توجد أدوات التشغيل في لوحة Cordis أعلى الإعدادات","panel.loading":"جارٍ القراءة…","panel.next":"التالي: {packageId}","panel.plugins.aria":"بلاقن Cordis","panel.readFailed":"فشلت قراءة قائمة البلاقن: {message}","panel.runningCount":"{count} قيد التشغيل","panel.title":"بلاقن Cordis","panel.trigger":"بلاقن Cordis","panel.version":"الإصدار","purpose.missing":"(لم يُذكر غرض)","render.failedAbdicated":"فشل العرض في {slot}؛ تمت استعادة الواجهة الافتراضية:","render.failedHeld":"فشل العرض في {slot}:","row.defineTitle":"تسجيل بلاقن Cordis","row.removeTitle":"إزالة بلاقن Cordis","row.runTitle":"تشغيل بلاقن Cordis","row.stopTitle":"إيقاف بلاقن Cordis","row.updateTitle":"تحديث بلاقن Cordis","run.removed":"لم تعد هذه الحزمة موجودة","run.superseded":"تتوفر بطاقة تشغيل أحدث أدناه","status.awaitingApproval":"بانتظار الموافقة","status.clientPending":"العميل جاهز للتفعيل","status.failed":"فشل التشغيل","status.idle":"جاهز","status.removed":"تمت الإزالة","status.running":"قيد التشغيل","status.superseded":"يتوفر تشغيل أحدث"},"cotTranslation":{"anonymousNotice":"لا يحتاج Bing وGoogle إلى تسجيل دخول أو مفتاح API للترجمة. وقد ترفض نقاط النهاية المجهولة الطلبات أو تحدّ منها.","bing":"Bing","codeTitle":"كتلة كود","copied":"تم النسخ","copy":"نسخ","deepseekAccount":"DeepSeek Flash — الحساب (مدفوع)","deepseekOfficial":"DeepSeek Flash — واجهة API الرسمية (مدفوع)","failed":"تعذّرت الترجمة. يُعرض النص الأصلي.","footnotes":"الحواشي","google":"Google","invalidLanguage":"أدخل auto أو رمز لغة مثل zh أو en أو ja.","invalidProvider":"اختر خدمة ترجمة.","original":"عرض الأصل","overridden":"متجاوَز","paidNotice":"كل جزء غير محفوظ في الكاش يُرسل طلبًا مدفوعًا مستقلًا إلى DeepSeek Flash عبر الحساب المحدد أو اعتمادات واجهة API الرسمية. وإعادة فتح الاستدلال تعيد استخدام النتائج المحفوظة؛ وقد يُرسل تغيير المزوّد أو اللغة أو النص المصدر أو إعدادات الطلب طلبًا مدفوعًا جديدًا.","privacy":"يُرسل الاستدلال الموسَّع إلى الخدمة المحددة، وقد يحتوي على كود خاص أو تفاصيل من المحادثة.","provider":"خدمة الترجمة","providerUnavailable":"هذا المزوّد غير متاح. اضبط حساب DeepSeek أو مزوّد واجهة API الرسمية، أو اختر خدمة متاحة.","providerUnavailableOption":"{provider} — غير متاح","readOnly":"يخزّن هذا النشر الإعدادات للقراءة فقط.","reset":"إعادة إلى الافتراضي","retry":"إعادة المحاولة","save":"حفظ","saveFailed":"لم يقبل النشر هذه القيم؛ تُركت لك لتصحيحها.","saving":"جارٍ الحفظ…","targetLanguage":"اللغة الهدف","targetLanguageHint":"تتبع قيمة auto لغة الواجهة؛ وتعمل أيضًا رموز اللغات مثل zh وen وja.","translating":"جارٍ ترجمة الاستدلال","translation":"عرض الترجمة","unavailable":"تفضيلات الترجمة غير متاحة.","unwrap":"إلغاء لف الأسطر","wrap":"لف الأسطر"},"deliverables":{"changes.added":"+{count}","changes.all":"كل الملفات ({count})","changes.binary":"ثنائي","changes.collapse":"طيّ","changes.collapseAria":"طيّ الملفات المتغيرة","changes.deleted":"-{count}","changes.expandAria":"عرض كل الملفات المتغيرة ({count})","changes.openReview":"مراجعة تغييرات هذه الدورة في الشريط الجانبي","changes.oversized":"كبير جدًا","changes.singleTitle":"تم تعديل {name}","changes.title":"تم تعديل {count} ملفات","changes.viewDiff":"عرض تغييرات {name}","diff.binary":"ملف ثنائي؛ لا يمكن عرض التغييرات","diff.coarse":"انتهت مهلة مقارنة الأسطر؛ يُعرض كاستبدال كامل للملف","diff.created":"أُنشئ في هذه الدورة","diff.deleted":"حُذف في هذه الدورة","diff.error":"تعذّرت قراءة التغييرات","diff.loading":"جارٍ قراءة التغييرات…","diff.missing":"لم تعد محتويات تغييرات هذه الدورة متاحة","diff.oversized":"الملف كبير جدًا؛ لا يمكن عرض التغييرات","diff.truncated":"عرض أول {count} أسطر","diff.unchanged":"كلا الجانبين يحتوي الأسطر نفسها","presented.all":"كل الملفات ({count})","presented.collapse":"طيّ","presented.collapseAria":"طيّ الملفات المسلَّمة","presented.directoryError":"تعذّر فتح المجلد الحاوي. حاول مرة أخرى.","presented.directoryOpened":"تم طلب فتح المجلد الحاوي","presented.directoryOpening":"جارٍ فتح المجلد الحاوي…","presented.error":"تعذّر الفتح. انقر لإعادة المحاولة.","presented.expandAria":"عرض كل الملفات المسلَّمة ({count})","presented.file":"ملف","presented.hostError":"تعذّرت قراءة معلومات سطح المكتب للمضيف","presented.nativeUnavailable":"لا يتوفر مسار مضيف لهذا الملف. عاينه في الشريط الجانبي.","presented.opened":"تم طلب الفتح","presented.opening":"جارٍ الفتح…","presented.preview":"معاينة في الشريط الجانبي","presented.previewButton":"فتح {name} في الشريط الجانبي","presented.previewCard":"معاينة {name} في الشريط الجانبي","presented.retry":"إعادة المحاولة","presented.revealError":"تعذّر العرض في مدير الملفات. حاول مرة أخرى.","presented.revealed":"تم طلب العرض في مدير الملفات","presented.revealing":"جارٍ العرض في مدير الملفات…","presented.unavailable":"لا يتوفر سطح مكتب لهذا المضيف لفتح الملفات أو المجلدات في تطبيقات خارجية. يمكن معاينة الملفات في الشريط الجانبي.","review.nowrap":"إيقاف التفاف الأسطر","review.openFile":"فتح الملف كاملًا في الشريط الجانبي","review.openFileAria":"فتح {name} في الشريط الجانبي","review.selectFile":"اختر الملف للمراجعة","review.split":"التبديل إلى العرض المنقسم","review.splitAria":"عرض منقسم","review.title":"مراجعة · الدورة {turn}","review.unified":"التبديل إلى العرض الموحّد","review.wrap":"تشغيل التفاف الأسطر","review.wrapAria":"التفاف الأسطر","row.error":"فشل التسليم","row.inspect":"فحص الاستدعاء","row.ok":"تم التسليم","row.preparing":"جارٍ تحضير المخرجات","row.running":"جارٍ التسليم","row.stopped":"تمت المقاطعة","row.title":"عرض الملفات"},"documentHtml":{"autoRefresh":"تحديث تلقائي","autoRefresh.disable":"إيقاف التحديث التلقائي","autoRefresh.enable":"تشغيل التحديث التلقائي","busy":"معاينة Office مشغولة. حاول بعد قليل.","changed":"تغيّر الملف أثناء القراءة. أعد فتح المعاينة.","charts":"مخططات","closeDetails":"إغلاق تفاصيل الخطوط","code.copied":"تم النسخ","code.copy":"نسخ","conditionalFormatting":"تنسيق شرطي","copied":"تم النسخ","copy":"نسخ","encoding":"تعذّرت قراءة ترميز النص هذا. احفظ الملف بترميز UTF-8 أو UTF-16 مع BOM ثم أعد المحاولة.","error.notFound":"الملف غير موجود. ربما نُقل أو حُذف.","error.notRegularFile":"ليس ملفًا عاديًا، لا يوجد ما يُعرض.","error.notText":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","error.tooLarge":"تتجاوز هذه الصفحة الحد {limit} ولا يمكن قراءتها.","error.unavailable":"فشلت القراءة: {message}","failed":"تعذّر عرض PDF: {message}","featureSeparator":"، ","footnotes":"الحواشي","formulaWarning":"يحتوي هذا المصنف على صيغ. قد تكون النتائج المعروضة ناقصة أو غير دقيقة.","frame":"معاينة مستند HTML","images":"صور","invalid":"لا يمكن معاينة ملف Office هذا. قد يكون تالفًا أو محميًا بكلمة مرور أو بامتداد خاطئ.","language":"en","loadMore":"تحميل المزيد","loading":"جارٍ عرض المستند...","missingFontsCount":"الخطوط: {count}","missingFontsDescription":"هذه الخطوط غير متاحة لهذه المعاينة. قد يختلف النص والتخطيط عن المستند الأصلي.","missingFontsTitle":"خطوط مفقودة","openWith":"فتح باستخدام","pageImage":"صفحة PDF {page}","password":"يتطلب ملف PDF هذا كلمة مرور؛ لا تُدعم المعاينات المحمية بكلمة مرور.","preview":"معاينة الصورة: {name}","reload":"إعادة قراءة الملف","reloadNow":"إعادة التحميل","rendererUnavailable":"معاينة {name} غير متاحة.","rendering":"جارٍ عرض الصفحة…","resourceUnavailable":"خدمة موارد الملفات غير متاحة.","retry":"إعادة المحاولة","shapes":"أشكال","timeout":"انتهت مهلة تحويل Office. حاول مرة أخرى.","title":"PDF","tooLarge":"يتجاوز ملف Office أو ملف PDF المحوّل حد حجم المعاينة. قلّل حجم الملف أو عدّل إعدادات المعاينة.","unavailable":"معاينات Office غير متاحة. شغّل خدمة معاينة المستندات على الحاسوب الذي يعمل عليه DeepSeek Harness.","unsupported":"تتطلب معاينة PDF محتويات الملف كاملة.","unsupportedFile":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","unsupportedNotice":"لا تدعم هذه المعاينة {features} في هذا المصنف. افتحه في تطبيق نظام للحصول على التجربة الكاملة.","viewMissingFonts":"خطوط مفقودة: {count}. انقر للعرض.","viewer.label":"Markdown","viewer.text":"نص عادي","workerFailed":"تعذّر متابعة عملية عرض PDF. يرجى إعادة المحاولة.","wrap.aria":"التفاف الأسطر","wrap.disable":"إيقاف التفاف الأسطر","wrap.enable":"تشغيل التفاف الأسطر","zoomControls":"أدوات التكبير","zoomFitWidth":"ملاءمة العرض","zoomIn":"تكبير","zoomMenu":"اختيار مستوى التكبير","zoomOut":"تصغير","zoomValue":"{percent}%"},"documentMarkdown":{"autoRefresh":"تحديث تلقائي","autoRefresh.disable":"إيقاف التحديث التلقائي","autoRefresh.enable":"تشغيل التحديث التلقائي","busy":"معاينة Office مشغولة. حاول بعد قليل.","changed":"تغيّر الملف أثناء القراءة. أعد فتح المعاينة.","charts":"مخططات","closeDetails":"إغلاق تفاصيل الخطوط","code.copied":"تم النسخ","code.copy":"نسخ","conditionalFormatting":"تنسيق شرطي","copied":"تم النسخ","copy":"نسخ","encoding":"تعذّرت قراءة ترميز النص هذا. احفظ الملف بترميز UTF-8 أو UTF-16 مع BOM ثم أعد المحاولة.","error.notFound":"الملف غير موجود. ربما نُقل أو حُذف.","error.notRegularFile":"ليس ملفًا عاديًا، لا يوجد ما يُعرض.","error.notText":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","error.tooLarge":"تتجاوز هذه الصفحة الحد {limit} ولا يمكن قراءتها.","error.unavailable":"فشلت القراءة: {message}","failed":"تعذّر عرض PDF: {message}","featureSeparator":"، ","footnotes":"الحواشي","formulaWarning":"يحتوي هذا المصنف على صيغ. قد تكون النتائج المعروضة ناقصة أو غير دقيقة.","frame":"معاينة مستند HTML","images":"صور","invalid":"لا يمكن معاينة ملف Office هذا. قد يكون تالفًا أو محميًا بكلمة مرور أو بامتداد خاطئ.","language":"en","loadMore":"تحميل المزيد","loading":"جارٍ عرض المستند...","missingFontsCount":"الخطوط: {count}","missingFontsDescription":"هذه الخطوط غير متاحة لهذه المعاينة. قد يختلف النص والتخطيط عن المستند الأصلي.","missingFontsTitle":"خطوط مفقودة","openWith":"فتح باستخدام","pageImage":"صفحة PDF {page}","password":"يتطلب ملف PDF هذا كلمة مرور؛ لا تُدعم المعاينات المحمية بكلمة مرور.","preview":"معاينة الصورة: {name}","reload":"إعادة قراءة الملف","reloadNow":"إعادة التحميل","rendererUnavailable":"معاينة {name} غير متاحة.","rendering":"جارٍ عرض الصفحة…","resourceUnavailable":"خدمة موارد الملفات غير متاحة.","retry":"إعادة المحاولة","shapes":"أشكال","timeout":"انتهت مهلة تحويل Office. حاول مرة أخرى.","title":"PDF","tooLarge":"يتجاوز ملف Office أو ملف PDF المحوّل حد حجم المعاينة. قلّل حجم الملف أو عدّل إعدادات المعاينة.","unavailable":"معاينات Office غير متاحة. شغّل خدمة معاينة المستندات على الحاسوب الذي يعمل عليه DeepSeek Harness.","unsupported":"تتطلب معاينة PDF محتويات الملف كاملة.","unsupportedFile":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","unsupportedNotice":"لا تدعم هذه المعاينة {features} في هذا المصنف. افتحه في تطبيق نظام للحصول على التجربة الكاملة.","viewMissingFonts":"خطوط مفقودة: {count}. انقر للعرض.","viewer.label":"Markdown","viewer.text":"نص عادي","workerFailed":"تعذّر متابعة عملية عرض PDF. يرجى إعادة المحاولة.","wrap.aria":"التفاف الأسطر","wrap.disable":"إيقاف التفاف الأسطر","wrap.enable":"تشغيل التفاف الأسطر","zoomControls":"أدوات التكبير","zoomFitWidth":"ملاءمة العرض","zoomIn":"تكبير","zoomMenu":"اختيار مستوى التكبير","zoomOut":"تصغير","zoomValue":"{percent}%"},"feedback":{"action.dislike":"ردّ سيئ","action.dislikeActive":"إزالة التقييم","action.like":"ردّ جيد","action.likeActive":"إزالة التقييم","category.instruction-following":"فهم التعليمات واتباعها","category.other":"أخرى","category.product-interaction":"ميزات المنتج والتفاعل","category.resource-cost":"استهلاك الموارد والتكلفة","category.security-privacy-permission":"الأمان والخصوصية والصلاحيات","category.service-stability":"الاستقرار والسرعة","category.task-result":"نتيجة المهمة","dialog.categories":"فئة الملاحظات","dialog.detail":"تفاصيل الملاحظات","dialog.hint":"أضف تفاصيل لمساعدتنا على التحسين. سيتضمن ما ترسله سجل المحادثة الحالية.","dialog.title":"إرسال الملاحظات","error.conflict":"تغيّرت هذه الملاحظات في مكان آخر؛ يتم عرض أحدث حالة","error.generic":"تعذّر حفظ الملاحظات","error.load":"تعذّر تحميل الملاحظات","error.noteTooLarge":"الوصف طويل جدًا؛ اختصره ثم أعد الإرسال","toast.recorded":"شكرًا على ملاحظاتك"},"goal":{"action.cancel":"إلغاء التعديل","action.clear":"مسح الهدف","action.edit":"تعديل الهدف","action.pause":"إيقاف الهدف مؤقتًا","action.resume":"استئناف الهدف","action.save":"حفظ الهدف","commandInput.aria":"إدخال الأوامر","objective.aria":"الغاية المستهدفة","phase.active":"هدف جارٍ","phase.active.disarmed":"هدف غير مُفعّل","phase.blocked":"هدف متعطّل","phase.paused":"هدف متوقف مؤقتًا"},"job":{"count.idle.one":"{count} مهمة خلفية","count.idle.other":"{count} مهام خلفية","count.live.one":"{count} مهمة خلفية قيد التشغيل","count.live.other":"{count} مهام خلفية قيد التشغيل","duration.hours":"{hours}س {minutes}د","duration.minutes":"{minutes}د {seconds}ث","duration.seconds":"{seconds}ث","duration.title.done":"استغرقت {duration}","duration.title.live":"قيد التشغيل منذ {duration}","kill.confirm":"انقر مرة أخرى للتأكيد","kill.confirmAction":"تأكيد الإيقاف","kill.failed":"فشل الإيقاف","kill.stop":"إيقاف المهمة {label}","list.aria":"المهام الخلفية","output.error":"انقطع بث المخرجات المباشر: {error}","output.gap":"… تم إسقاط مخرجات سابقة …","row.collapseAria":"إخفاء المخرجات المباشرة لـ{label}","row.expandAria":"عرض المخرجات المباشرة لـ{label}","section.clear":"مسح","section.live":"قيد التشغيل","section.settledCount":"منتهية {count}","status.completed":"مكتملة","status.failed":"فاشلة","status.killed":"ملغاة","status.running":"قيد التشغيل","status.stopping":"جارٍ الإيقاف","terminal.collapse":"طيّ","terminal.collapseAria":"طيّ المخرجات","terminal.commandLine":"سطر الأوامر {n}","terminal.copied":"تم النسخ","terminal.copy":"نسخ","terminal.done":"تم","terminal.exitCode":"رمز الخروج {code}","terminal.expand":"عرض {n} أسطر إضافية","terminal.expandAria":"توسيع {n} من أسطر المخرجات المطوية","terminal.failed":"فشل","terminal.noExitCode":"لا يوجد رمز خروج","terminal.noOutput":"(لا مخرجات)","terminal.running":"قيد التشغيل","terminal.signal":"إشارة {signal}"},"model":{"action.reload":"إعادة التحميل","command.description":"اختر الموديل لهذه المحادثة","command.label":"الموديل","effort.providerDefault":"افتراضي","empty.efforts":"لا يوفر هذا الموديل مستويات لجهد الاستدلال.","empty.models":"لا توجد موديلات متاحة.","error.action":"فشلت عملية الموديل: {message}","error.sessionInUse":"هذه الجلسة قيد الاستخدام بالفعل، ربما بواسطة نسخة DSH أخرى قيد التشغيل (مثل dsh web أو تطبيق سطح المكتب). أغلق نسخ DSH الأخرى العاملة وحاول مرة أخرى.","menu.aria":"الموديل وجهد الاستدلال","menu.effort":"الجهد","menu.model":"الموديل","option.loadError":"فشل تحميل الكتالوج: {message}","provider.account":"حساب DeepSeek","search.clear":"مسح البحث","search.empty":"لا توجد موديلات مطابقة.","search.placeholder":"بحث في الموديلات…","status.loading":"جارٍ تحديث قائمة الموديلات…","trigger.aria":"اختيار الموديل، الحالي {model}","trigger.ariaEffort":"اختيار الموديل، الحالي {model}، جهد الاستدلال {effort}","trigger.fallback":"اختيار الموديل","trigger.loading":"جارٍ تحميل الموديلات…","trigger.selectAria":"اختيار الموديل","warning.groupLoad":"فشل تحميل {name}: {message}"},"open-in-app":{"app.androidstudio":"Android Studio","app.cursor":"Cursor","app.explorer":"File Explorer","app.filemanager":"Files","app.finder":"Finder","app.fork":"Fork","app.ghostty":"Ghostty","app.gitbash":"Git Bash","app.github":"GitHub Desktop","app.gitkraken":"GitKraken","app.gnometerminal":"GNOME Terminal","app.goland":"GoLand","app.intellij":"IntelliJ IDEA","app.iterm":"iTerm2","app.kitty":"kitty","app.konsole":"Konsole","app.phpstorm":"PhpStorm","app.pycharm":"PyCharm","app.rider":"Rider","app.rustrover":"RustRover","app.smartgit":"SmartGit","app.sourcetree":"Sourcetree","app.sublimemerge":"Sublime Merge","app.sublimetext":"Sublime Text","app.terminal":"Terminal","app.tower":"Tower","app.vscode":"VS Code","app.vscodeinsiders":"VS Code Insiders","app.warp":"Warp","app.webstorm":"WebStorm","app.windowsterminal":"Windows Terminal","app.windsurf":"Windsurf","app.xcode":"Xcode","app.zed":"Zed","open.title":"فتح في {app}","open.tooltip":"فتح محليًا","path.appDefault":"{app} (افتراضي)","path.appsError":"تعذّر تحميل التطبيقات","path.more":"طرق أخرى للفتح","path.open":"فتح","path.openError":"تعذّر الفتح. حاول مرة أخرى.","path.reveal":"عرض موقع الملف","path.revealError":"تعذّر عرض موقع الملف. حاول مرة أخرى.","shortcut.busy":"جارٍ فتح مساحة العمل","shortcut.unavailable":"مساحة العمل الحالية أو التطبيق المحلي غير متاح"},"permission.access":{"confirm.acknowledge":"أفهم المخاطر وأريد المتابعة","confirm.cancel":"إلغاء","confirm.description":"يمنح الوصول الكامل الجلساتِ الجديدة إمكانية تقليل خطوات التأكيد وتنفيذ مزيد من الإجراءات مباشرة، بما في ذلك العمليات الحساسة أو تغييرات الملفات أو الأوامر الخارجية. استخدمه فقط عندما تثق بالمهام اللاحقة.","confirm.enable":"تشغيل الوصول الكامل","confirm.title":"هل تريد تشغيل الصلاحية الكاملة؟","description":"اختر وضع الصلاحيات الافتراضي للجلسات الجديدة","loading":"جارٍ التحميل","preset.fullAccess":"وصول كامل","preset.readOnly":"قراءة فقط","preset.workspaceWrite":"كتابة في مساحة العمل","title":"الصلاحية","unavailable":"غير متاح"},"plan":{"chip.exitFailed":"فشل الخروج من وضع الخطة","chip.label":"الخطة","chip.on.aria":"وضع الخطة مُفعّل، اضغط للإيقاف","chip.on.title":"وضع الخطة مُفعّل — انقر للإيقاف (/plan off)","preview.action":"فتح","preview.document":"الخطة · Markdown","preview.expired":"انتهت صلاحية معاينة الخطة المؤقتة هذه. أعد فتحها من بطاقة المراجعة المعلّقة.","preview.failed":"تعذّر تحميل الخطة","preview.full":"عرض الخطة كاملة","preview.historyUnavailable":"سجل الجلسة غير متاح","preview.invalidAddress":"عنوان خطة غير صالح","preview.loading":"جارٍ تحميل الخطة…","preview.notFound":"لم يتم العثور على هذه الخطة","preview.open":"فتح الخطة في الشريط الجانبي","preview.openNamed":"فتح الخطة: {title}","preview.title":"الخطة","preview.unavailable":"معاينة الخطة غير متاحة"},"pluginManager":{"addPlugin":"إضافة بلاقن","backToList":"العودة إلى البلاقن","backToPackage":"العودة إلى {name}","basicTitle":"إعدادات البلاقنات المضمّنة","bundlesTitle":"المثبَّتة","cancel":"إلغاء","chooseAddMethod":"اختر طريقة إضافة بلاقن","close":"إغلاق","configureRow":"إعداد {name}","confirmUninstall":"إلغاء التثبيت","confirmUninstallDescription":"تختفي الوظائف التي يوفرها بمجرد إلغاء تثبيته.","confirmUninstallTitle":"إلغاء تثبيت \"{name}\"؟","crumbRoot":"البلاقن","empty":"لم يتم تثبيت أي بلاقن بعد.","enableToggle":"تشغيل {name}","error":"تعذّرت قراءة جميع البلاقن، ربما بسبب مشكلة في الشبكة","extensionsTitle":"البلاقنات التجريبية","failedDisable":"تعذّر الإيقاف: {reason}","failedEnable":"تعذّر التشغيل: {reason}","failedRowDisable":"تعذّر إيقاف المكوّن: {reason}","failedRowEnable":"تعذّر تشغيل المكوّن: {reason}","failedUninstall":"تعذّر إلغاء التثبيت: {reason}","infoDescription":"اضبط البلاقن الرسمية وثبّت البلاقن الأخرى أو أدِرها من هنا. اعرض قائمة البلاقن المضمّنة وحالة بيئة التشغيل في الإعدادات → البلاقن المضمّنة.","infoLabel":"حول البلاقن","installApplying":"جارٍ تطبيق الإعدادات، يرجى الانتظار…","installApplyingCancellationError":"لم يتم تأكيد الإلغاء. يجري تطبيق التثبيت؛ انتظر نتيجته. {reason}","installApprovalCaution":"لا تسمح إلا بالحزم التي تثق بها.","installApprovalConsequence":"بعد السماح، تعمل السكربتات هنا بصلاحياتك، وتُحفظ الصلاحية في هذا الملف الشخصي.","installApprovalDescription":"تحتوي هذه الحزم على سكربتات تثبيت لم يشغّلها pnpm.","installApprovalTitle":"سكربتات التثبيت تحتاج إلى صلاحية","installApproveAndRetry":"السماح بهذه السكربتات وإعادة المحاولة","installAttempt":"تعذّر على {previous} توفير الحزمة؛ إعادة المحاولة عبر {registry} (سجل الحزم {index} من {total})","installAttemptBadge":"المحاولة {index} · {registry}","installAwaitingAcceptance":"بانتظار قبول المضيف للتثبيت. ستُعاد محاولة الإلغاء تلقائيًا بعد التأكيد.","installBackgroundApplying":"يجري تطبيق التثبيت ولا يمكن إلغاؤه. اعرض تقدم التثبيت.","installBackgroundDone":"اكتمل التثبيت. اعرض تفاصيل التثبيت.","installBackgroundFailed":"فشل التثبيت. اعرض تفاصيل التثبيت.","installBackgroundUnconfirmed":"حالة التثبيت غير مؤكدة. اعرض التثبيت للاطلاع على التفاصيل.","installBackgroundUnknown":"نتيجة التثبيت غير متاحة. تحقق من قائمة البلاقن.","installCancel":"إلغاء التثبيت","installCancelAndEdit":"إلغاء التثبيت والعودة إلى التعديل","installCancelUnconfirmed":"لم يتم تأكيد إيقاف التثبيت. أعد محاولة الإلغاء أو انتظر نتيجة التثبيت. {reason}","installCancelled":"أُلغي التثبيت؛ البلاقن غير مُفعّل، وقد تبقى الملفات التي تم تنزيلها","installCancelledShort":"أُلغي","installCancelling":"جارٍ إيقاف التثبيت…","installChangeRegistry":"تغيير سجل الحزم","installChecking":"جارٍ التحقق…","installClose":"تم","installCloseCancels":"إلغاء التثبيت والإغلاق","installDescription":"أدخل اسم حزمة البلاقن أو عنوان مستودع GitHub أو مسار دليل محلي.","installDetailsHide":"إخفاء تفاصيل التثبيت","installDetailsShow":"عرض تفاصيل التثبيت","installDoneApproved":"تم السماح بسكربتات التثبيت لـ{names}","installDoneNothing":"اكتمل التثبيت دون أي اعتمادية جديدة.","installDoneOtherVersion":"بموجب سياسة أمان سلسلة التوريد في pnpm (minimumReleaseAge)، لا تُثبَّت تلقائيًا الإصدارات التي مضى على نشرها وقت أقل من المدة المطلوبة، لذا استخدم هذا التثبيت {installed} بدلًا من أحدث إصدار {version}. الإصدار المنشور حديثًا لم يكمل فترة الانتظار هذه وقد يحتوي على كود ضارة أو عيوب لم تُكتشف. إذا كنت بحاجة إلى {version}، فألغِ تثبيت الإصدار الحالي ثم ثبّت {exact} لطلب ذلك الإصدار.","installDoneRestart":"تم التثبيت؛ سيُحمَّل عند التشغيل التالي.","installEdit":"تعديل","installEditAria":"العودة إلى التعديل","installEnableNow":"تشغيل الآن","installExisting":"تثبيت بلاقن من طرف ثالث","installExistingDescription":"يدعم حزم npm ومستودعات Git والأدلة المحلية","installFailedTitle":"تعذّر تثبيت البلاقن","installFailureBuildBlocked":"تحتاج سكربتات تثبيت إحدى الاعتماديات إلى صلاحيتك قبل أن يتواصل التثبيت","installFailureBuildBlockedManual":"حجب pnpm سكربتات التثبيت؛ اسمح بها ضمن allowBuilds في pnpm-workspace.yaml ثم أعد المحاولة","installFailureDiskFull":"القرص ممتلئ؛ توقف التثبيت","installFailureGeneric":"حدث خطأ أثناء التثبيت؛ توضح التفاصيل سببه","installFailureIntegrity":"فشلت الحزمة التي تم تنزيلها في فحص السلامة","installFailureNetwork":"فشل اتصال الشبكة","installFailureNetworkAll":"تعذّر الوصول إلى أي سجل حزم (تمت المحاولة: {registries}). تحقق من إعدادات الشبكة أو الوسيط، أو غيّر سجل الحزم وأعد المحاولة.","installFailureNetworkHost":"تعذّر الوصول إلى {host}. لا يتم جلب عنوان GitHub أو رابط .tgz عبر سجل الحزم: يجب أن يصل إليه هذا الجهاز مباشرة أو عبر وسيط. إذا كان البلاقن منشورًا على npm أيضًا، فأدخل اسم حزمته بدلًا من ذلك.","installFailureNoMatchingVersion":"لا يوجد إصدار يطابق الطلب","installFailureNotFound":"لم يتم العثور على هذا البلاقن","installFailurePermission":"لا توجد صلاحية كتابة؛ لا يمكن تثبيت البلاقن","installFailurePnpmMissing":"لم يتم العثور على pnpm، لذا لا يمكن تثبيت أي شيء","installFailureTimeout":"انتهت مهلة التثبيت","installGitTemplateHint":"استبدل هذا بعنوان مستودع Git الفعلي.","installGithubFailedDescription":"جرّب مصدر تثبيت آخر.","installGithubFailedTitle":"تعذّر الوصول إلى GitHub","installGithubTimeoutTitle":"انتهت مهلة الاتصال بـGitHub","installGuideExampleLabel":"مثال: ","installGuideFill":"استخدام المثال","installGuideFillAria":"استخدام المثال {example}","installGuideHide":"إخفاء الدليل","installGuideIdExample":"dsh-plugin-whale-pet","installGuideIdHint":"اسم حزمة البلاقن هو اسم حزمة npm (مثل dsh-xxx أو @author/plugin): وهو الجزء الذي يلي dsh plugin add أو pnpm add في أمر التثبيت بملف README الخاص ببلاقن مجتمعي.","installGuideIdTitle":"أدخل اسم حزمة npm للبلاقن","installGuideSafety":"ثبّت فقط البلاقن التي تثق بها: فهي تعمل بصلاحياتك وقد تضر DeepSeek Harness أو تسرّب بياناتك.","installGuideToggle":"دليل التثبيت والأمثلة","installLocation":"يُثبَّت في {dir}","installPackageLabel":"اسم حزمة البلاقن","installPathTemplateHint":"استبدل هذا بالمسار الفعلي لدليل البلاقن المحلي لديك.","installProblemInstalled":"هذا البلاقن مثبَّت بالفعل. لترقيته، ألغِ تثبيته ثم ثبّته مرة أخرى","installProblemInvalid":"هذا ليس اسم حزمة أو عنوانًا قابلًا للتثبيت: {reason}","installProblemNetwork":"تعذّر الوصول إلى سجل حزم البلاقن؛ تحقق من الشبكة وحاول مرة أخرى","installProblemNetworkAll":"تعذّر الوصول إلى أي سجل حزم (تمت المحاولة: {registries})؛ تحقق من إعدادات الشبكة أو الوسيط، أو غيّر سجل الحزم","installProblemNotBundle":"لا تُعلن هذه الحزمة البرمجية عن أي حزمة، لذا لا يمكن تثبيتها كبلاقن: {reason}","installProblemNotFound":"لم يتم العثور على هذا البلاقن","installProblemNotPackage":"المسار غير موجود أو ليس حزمة بلاقن صالحة","installProblemShipped":"يأتي هذا البلاقن مع DSH؛ وتحديث DSH يحدّثه","installProblemUnknown":"تعذّر البحث عن البلاقن: {reason}","installReconcile":"التحقق من حالة التثبيت","installResultUnconfirmed":"لم يتم استلام نتيجة التثبيت. تحقق من حالة التثبيت. {reason}","installRetry":"إعادة المحاولة","installRun":"تثبيت","installSpecLabel":"اسم الحزمة أو عنوانها","installSpecPlaceholder":"مثل dsh-plugin-whale-pet","installStarting":"جارٍ تحضير التثبيت…","installSubjectGit":"مستودع Git","installSubjectPath":"دليل محلي","installSubjectTarball":"أرشيف tarball","installTitle":"إضافة بلاقن","installTryAnotherWay":"جرّب طريقة أخرى","installUnconfirmedTitle":"حالة التثبيت غير مؤكدة","installUnknownDescription":"لا يوجد لدى المضيف تثبيت نشط بمعرّف الطلب هذا. تحقق من قائمة البلاقن قبل المحاولة مرة أخرى.","installUnknownTitle":"نتيجة التثبيت غير متاحة","installUpgradeNotice":"لا تُحدَّث البلاقن المثبَّتة تلقائيًا بعد. لترقية بلاقن، ألغِ تثبيته وثبّت الإصدار الجديد. وستواصل الإصدارات اللاحقة تحسين تجربة الترقية.","installUseGithubMirror":"استخدام مرآة البر الرئيسي للصين","installVersion":"الإصدار {version}","installViewTask":"عرض التثبيت","installedTitle":"المثبَّتة","installingTitle":"جارٍ تثبيت البلاقن…","intro":"ثبّت البلاقن وشغّلها واضبطها","loading":"جارٍ قراءة البلاقن…","metadataError":"خطأ في بيانات الحزمة الوصفية: {error}","moreAction":"المزيد","moreTitle":"البلاقنات التجريبية","openDetail":"عرض {name}","overriddenNotice":"تم حفظ {name}، لكن إعدادًا ذا أولوية أعلى يتجاوزه، لذا فهو غير سارٍ","panel":"البلاقن","partOff":"متوقف","partToggle":"تشغيل المكوّن {name}","partsCountFailed":"{count} فاشلة","partsCountOff":"{count} متوقفة","partsCountRunning":"{count} قيد التشغيل","partsCountTotal":"الإجمالي {count}","partsEmpty":"لا تحتوي حزمة البلاقن هذه على أي مكوّنات.","partsFilter":"تصفية المكوّنات","partsFilterEmpty":"لا يوجد مكوّن مطابق.","partsLabel":"المكوّنات","reasonAmbiguousInstall":"لا يمكن تحديد الحزمة التي تم تثبيتها من تغيير الاعتماديات.","reasonBundleInUse":"لا يزال إعداد آخر يستخدم مكوّنات هذه الحزمة؛ أوقفها أولًا.","reasonIncompatibleInstall":"ثبّت إصدارًا من البلاقن متوافقًا مع DSH هذا.","reasonIncompatibleInstalled":"أزل تثبيته وثبّت إصدارًا متوافقًا مع DSH هذا.","reasonIncompatibleVersion":"{plugin} غير متوافق مع DSH {runtime} (يتطلب {peers})؛ قد يؤدي تشغيله إلى أعطال أو فقدان بيانات.","reasonIncompatibleVersionUnnamed":"هذا البلاقن غير متوافق مع إصدار DSH قيد التشغيل؛ قد يؤدي تشغيله إلى أعطال أو فقدان بيانات.","reasonInvalidSpec":"أدخل اسم حزمة أو عنوانًا صالحًا.","reasonLabel":"السبب","reasonManagementRequired":"تحتاجه إدارة البلاقن؛ فلا يمكن إيقافه أو إزالة تثبيته.","reasonNotBundle":"لا تُعلن هذه الحزمة البرمجية عن أي حزمة، لذا لا يمكن إدارتها كبلاقن.","reasonNotRemovable":"هذه الحزمة البرمجية ليست مملوكة للملف الشخصي، أو أن إدارة البلاقن تحتاجها.","reasonOperationError":"أبلغ المضيف عن خطأ.","reasonStaleApproval":"تغيّرت موافقات السكربتات المعلّقة؛ أعد التثبيت لتحديثها.","reasonStopProfile":"يعمل هذا الملف الشخصي دون HMR؛ أوقفه وأزل تثبيت الحزمة باستخدام dsh plugin.","reasonUnaddressable":"لا يمكن لرقعة الملف الشخصي استهداف هذا العنصر بشكل فريد.","reasonUnknownPlugin":"لا يوجد بلاقن بهذا الاسم.","refresh":"تحديث","refreshError":"فشل التحديث. حاول مرة أخرى.","registryCustom":"عنوان مخصص","registryCustomHint":"أدخل عنوان سجل npm داخلي أو خاص يبدأ بـ http:// أو https://. إذا كان يتطلب تسجيل دخول، فخزّن الاعتماد في ~/.npmrc على هذا الجهاز.","registryCustomInvalid":"أدخل عنوانًا يبدأ بـ http:// أو https://","registryCustomPlaceholder":"https://npm.example.com/","registryDefault":"السجل الافتراضي","registryLegend":"سجل npm الذي يُنزَّل منه البلاقن","registryListSeparator":"، ","registryNpmmirror":"مرآة الصين القارية","registryOfficial":"سجل npm الرسمي","registryToggle":"السجل","restartNotice":"يسري التغيير عند التشغيل التالي","retry":"إعادة المحاولة","rowPhaseActive":"قيد التشغيل","rowPhaseFailed":"مشكلة","rowPhaseLoading":"جارٍ التحميل","rowPhasePending":"في انتظار التبعيات","rowPhaseUnloading":"جارٍ إلغاء التحميل","rowStateIdle":"غير مشغّل","sentenceSeparator":" ","sourceBuiltIn":"مدمج","sourceNotInstalled":"غير مثبَّت","sourceSpec":"مصدر الكود","sourceTargetSpec":"المصدر المطابق لنسخة DSH هذه","sourceTargetVersion":"الإصدار المطابق لنسخة DSH هذه","sourceTitle":"المصدر","sourceVersion":"الإصدار الحالي","statusBeta":"تجريبي","statusMissingFiles":"الحزمة البرمجية غير متاحة","statusNotInstalled":"غير مثبَّت","statusProblem":"مشكلة","statusUpdateAvailable":"يتوفّر تحديث","terminalCollapse":"طيّ","terminalCollapseAria":"طيّ المخرجات","terminalCommandLine":"سطر الأوامر {n}","terminalCopied":"تم النسخ","terminalCopy":"نسخ","terminalDone":"تم","terminalExitCode":"رمز الخروج {code}","terminalExpand":"… {n} سطرًا إضافيًا","terminalExpandAria":"توسيع أسطر المخرجات المتبقية البالغ عددها {n}","terminalFailed":"فشل","terminalNoExitCode":"لا رمز خروج","terminalNoOutput":"لا مخرجات","terminalRunning":"قيد التشغيل","terminalSignal":"إشارة {signal}","title":"البلاقن","unavailable":"يعمل هذا النشر دون ملف شخصي قابل للإدارة، لذا لا يمكن تثبيت البلاقن أو تشغيلها هنا.","uninstall":"إزالة التثبيت","uninstallLabel":"إزالة تثبيت {name}","update":"تحديث","updateLabel":"تحديث {name}","versionTag":"v{version}"},"question":{"action.next":"التالي","action.skip":"تخطي","custom.placeholder":"اكتب إجابتك","error.incomplete":"يرجى إكمال هذا السؤال أولًا.","error.resubmit":"لم تصل الإجابة قبل متابعة العمل؛ أرسلها مرة أخرى.","error.unanswered":"يرجى اختيار أحد الخيارات أو إدخال إجابة مخصصة.","error.unavailable":"لا يمكن الإرسال الآن؛ حاول بعد قليل.","nav.cancel":"إغلاق كل الأسئلة","nav.close":"إغلاق اللوحة — أعد فتحها من استدعاء الأداة","nav.maximize":"توسيع بطاقة السؤال","nav.minimize":"طيّ بطاقة السؤال","nav.next":"السؤال التالي","nav.prev":"السؤال السابق","option.recommended":"موصى به","plan.approve":"موافقة","plan.decline":"رفض","plan.discuss":"طلب تغييرات","plan.header":"مراجعة الخطة","reply.answerLabel":"الإجابة: ","reply.close":"إغلاق تفاصيل السؤال","reply.label":"الرد على الأسئلة المعلّقة السابقة","reply.open":"فتح تفاصيل السؤال","reply.skipped":"تم التخطي","review.skipped":"تم تخطي هذا السؤال.","review.status":"تمت الإجابة","status.sent":"تم إرسال الرد؛ تعذّر إغلاق اللوحة.","wait.continued":"استمر العمل — لا يزال بإمكانك الإجابة","wait.countdown":"المتابعة بعد {seconds} ثانية","wait.held":"في انتظار إجابتك","wait.paused":"متوقف مؤقتًا · تبقّى {seconds} ثانية","wait.takeTime":"خذ وقتك"},"reference":{"candidate.noCwd":"(لا دليل عمل)","crumb.root":"مساحة العمل","section.files":"الملفات والمجلدات","section.sessions":"الجلسات","section.subagents":"الوكلاء الفرعيون","time.days":"{n} يوم","time.hours":"{n} ساعة","time.minutes":"{n} دقيقة","time.months":"{n} شهر","time.now":"الآن","time.years":"{n} سنة"},"schedule.catalog":{"card.deleted":"محذوفة","card.open":"فتح","card.openLabel":"فتح تفاصيل المهمة: {title}","cron.day.both":"اليوم {days} من كل شهر أو {weekdays}{months}","cron.day.bothStarred":"اليوم {days} من كل شهر و{weekdays}{months}","cron.day.every":"كل يوم{months}","cron.day.monthDays":"اليوم {days} من كل شهر{months}","cron.day.weekdays":"{weekdays}{months}","cron.hours.list":"{hours}","cron.hours.range":"{from}–{to}","cron.list.join":"، ","cron.months":" في {months}","cron.part.join":" ","cron.time.at":"عند {times}","cron.time.everyHour":"كل ساعة","cron.time.everyMinute":"كل دقيقة","cron.time.everyMinutes":"كل {step} دقيقة","cron.time.everyNHours":"كل {count} ساعة","cron.time.hourlyAt":"كل ساعة عند الدقيقة {minutes}","cron.time.hoursAt":"عند الدقيقة {minutes} من الساعات {hours}","cron.time.hoursEveryMinute":"كل دقيقة خلال الساعات {hours}","cron.time.hoursEveryMinutes":"كل {step} دقيقة خلال الساعات {hours}","cron.time.joinedEveryHour":"كل ساعة","cron.time.joinedEveryMinute":"كل دقيقة","cron.time.joinedEveryMinutes":"كل {step} دقيقة","cron.time.joinedEveryNHours":"كل {count} ساعة","cron.time.joinedHourlyAt":"كل ساعة عند الدقيقة {minutes}","cron.weekday.name":"{weekday}","cron.weekday.range":"{from}–{to}","cronForm.atMinute":"عند الدقيقة","cronForm.daily":"كل يوم","cronForm.dateOption":"اليوم {day}","cronForm.dates":"في تواريخ محددة","cronForm.frequency":"التكرار","cronForm.minuteDecrease":"تقليل الدقيقة","cronForm.minuteIncrease":"زيادة الدقيقة","cronForm.monthly":"شهريًا","cronForm.weekly":"أسبوعيًا","delete.action":"حذف المهمة","delete.cancel":"إلغاء","delete.close":"إغلاق تأكيد الحذف","delete.confirm":"تأكيد الحذف","delete.description":"يوقف هذا تشغيل المهمة ويحذفها مع سجلات التسليم المحفوظة. تبقى الجلسة الأصلية ورسائلها؛ ولا تُسحب الرسائل الموجودة في قائمة الانتظار.","delete.label":"حذف التذكير: {title}","delete.pending":"جارٍ الحذف…","delete.title":"حذف هذه المهمة؟","delivery.collapse":"طيّ","delivery.cursorError":"تم تحديث السجلات.","delivery.empty":"لا يوجد سجل تسليم متاح","delivery.error":"تعذّر تحميل سجلات التسليم.","delivery.expand":"توسيع","delivery.label":"سجل تسليم محفوظ","delivery.loadMore":"تحميل المزيد","delivery.loading":"جارٍ تحميل سجلات التسليم…","delivery.notFound":"لم تعد هذه المهمة متاحة.","delivery.pruned":"تم مسح سجلات التسليم الأقدم","delivery.refresh":"تحديث","delivery.retention":"قواعد الاحتفاظ","delivery.retentionBounds":"تحتفظ كل مهمة بما يصل إلى {records} من سجلات التسليم خلال آخر {days} يومًا.","delivery.retentionExplanation":"عند حفظ سجل جديد، تُمسح تلقائيًا السجلات الأقدم التي تتجاوز هذه الحدود. ولا يؤدي مسح السجلات إلى إيقاف المهمة.","delivery.retry":"إعادة المحاولة","detail.close":"إغلاق التفاصيل","detail.frequency":"التكرار","detail.id":"معرّف المهمة","detail.instruction":"تعليمات مهمة الأتمتة","detail.label":"تفاصيل المهمة","detail.missing":"المهمة غير متاحة. ربما تم حذفها.","detail.more":"إجراءات مهمة الأتمتة","detail.name":"اسم مهمة الأتمتة","detail.next":"موعد التشغيل التالي","detail.nextRun":"التشغيل التالي","detail.openSession":"الجلسة المرتبطة: فتح الجلسة الأصلية","detail.openSessionTitle":"الجلسة المرتبطة {title}: فتح الجلسة الأصلية","detail.records":"السجلات","detail.rule":"القواعد","detail.session":"الجلسة المرتبطة","detail.sessionArchived":"الجلسة الأصلية مؤرشفة.","detail.sessionLoading":"جارٍ تحميل معلومات الجلسة الأصلية.","detail.sessionUnavailable":"الجلسة الأصلية غير متاحة.","detail.status":"الحالة","detail.tabs":"عروض تفاصيل المهمة","empty.action":"مهمة أتمتة جديدة","frequency.cron":"Cron {expression} ({timeZone})","frequency.cronLocal":"Cron {expression}","frequency.cronRule":"{rule} ({timeZone})","frequency.daily":"يوميًا عند {time} ({timeZone})","frequency.dailyLocal":"يوميًا عند {time}","frequency.every":"كل {value} {unit}","frequency.once":"مرة واحدة","frequency.weekday.1":"الاثنين","frequency.weekday.2":"الثلاثاء","frequency.weekday.3":"الأربعاء","frequency.weekday.4":"الخميس","frequency.weekday.5":"الجمعة","frequency.weekday.6":"السبت","frequency.weekday.7":"الأحد","frequency.weekday.join":"، ","frequency.weekly":"أسبوعيًا يوم {weekdays} عند {time} ({timeZone})","frequency.weeklyLocal":"أسبوعيًا يوم {weekdays} عند {time}","hover.more":"{count} إضافية","list.aria":"التذكيرات النشطة","list.empty":"لا توجد مهام بعد. تظهر هنا المهام التي تُنشأ في جلساتك.","list.emptyInactive":"لا توجد مهام أتمتة غير نشطة","list.error":"تعذّر تحميل المهام.","list.label":"دليل المهام","list.loading":"جارٍ تحميل المهام…","list.nextPrefix":"موعد التشغيل التالي: ","list.nextRun":"التشغيل التالي","list.noMatches":"لا مهام مطابقة","list.open":"فتح تفاصيل التذكير: {title}","list.retry":"إعادة المحاولة","mark.aria":"{count} مهمة مجدولة","new.action":"جديد","panel":"مهام الأتمتة","relative.future":"بعد {value} {unit}","relative.now":"حان الموعد","relative.overdue":"متأخر بـ{value} {unit}","rule.cancel":"إلغاء","rule.cron":"مخصص","rule.cronInvalid":"أدخل تعبير cron من خمسة حقول، مثل 0 9 * * 1-5.","rule.cronLabel":"تعبير Cron","rule.daily":"كل يوم","rule.error.conflict":"تغيّرت هذه المهمة قبل حفظ التحديث. يعرض الصف القاعدة المحفوظة؛ أعد المحاولة.","rule.error.notFound":"لم تعد هذه المهمة متاحة.","rule.error.unknown":"تعذّر تأكيد تحديث القاعدة. يعرض الصف القاعدة المحفوظة.","rule.everyHours":"كل N ساعات","rule.everyMinutes":"كل N دقائق","rule.everySeconds":"كل N ثوانٍ","rule.invalidPrompt":"أدخل تعليمات المهمة.","rule.invalidTitle":"أدخل اسم مهمة لا يتجاوز 120 حرفًا.","rule.once":"مرة واحدة","rule.repeat":"التكرار","rule.save":"حفظ التغييرات","rule.saving":"جارٍ الحفظ…","rule.title":"وقت التشغيل","rule.unsaved":"تغييرات غير محفوظة","rule.weekday":"يوم الأسبوع","rule.weekdayOption":"يوم الأسبوع {weekday}","rule.weekdays":"الاثنين إلى الجمعة","rule.weekly":"أسبوعيًا","rule.zone.system":" (النظام)","search.clear":"مسح البحث","search.label":"بحث في المهام","search.placeholder":"بحث في مهام الأتمتة","status.active":"مشغّلة","status.inactive":"غير نشطة","statusFilter.all":"الكل","statusFilter.label":"حالة المهمة","time.locale":"ar","time.utcPrefix":"UTC","timing.conflict":"تغيّرت هذه المهمة أثناء التعديل. تم الاحتفاظ بمسودتك. ألغِ ثم أعد الفتح بعد التحديث لتعديل أحدث قاعدة.","timing.date":"التاريخ","timing.error":"تعذّر تأكيد تحديث التوقيت. تم الاحتفاظ بمسودتك. تحقق من المهمة قبل إعادة المحاولة.","timing.hour":"الساعة","timing.inactive":"المهام غير النشطة للقراءة فقط. لا يمكن تعديل توقيتها.","timing.interval":"التكرار كل","timing.intervalDecrease":"تقليل الفاصل","timing.intervalHint.hour":"ساعة واحدة على الأقل. يُحسب الفاصل من إنشاء المهمة أو آخر تغيير للقاعدة ولا يعتمد على المناطق الزمنية.","timing.intervalHint.minute":"دقيقة واحدة على الأقل. يُحسب الفاصل من إنشاء المهمة أو آخر تغيير للقاعدة ولا يعتمد على المناطق الزمنية.","timing.intervalHint.second":"60 ثانية على الأقل. يُحسب الفاصل من إنشاء المهمة أو آخر تغيير للقاعدة ولا يعتمد على المناطق الزمنية.","timing.intervalIncrease":"زيادة الفاصل","timing.invalid":"أدخل تاريخًا ووقتًا صالحين، أو تحقق من حقول التوقيت.","timing.invalidInterval":"أدخل فاصلًا لا يقل عن دقيقة واحدة.","timing.invalidInterval.hour":"أدخل فاصلًا لا يقل عن ساعة واحدة.","timing.invalidInterval.minute":"أدخل فاصلًا لا يقل عن دقيقة واحدة.","timing.invalidInterval.second":"أدخل فاصلًا لا يقل عن 60 ثانية.","timing.invalidZone":"أدخل منطقة زمنية IANA صالحة، مثل Asia/Shanghai.","timing.minute":"الدقيقة","timing.nextMonth":"الشهر التالي","timing.notFound":"لم تعد هذه المهمة متاحة. تم الاحتفاظ بمسودتك؛ ألغِ لإغلاق المحرر.","timing.notFuture":"اختر تاريخًا ووقتًا في المستقبل.","timing.prevMonth":"الشهر السابق","timing.second":"الثانية","timing.subagentSession":"تنتمي هذه الجلسة إلى وكيل فرعي، وهو لا يتلقى التذكيرات المُسلَّمة.","timing.time":"الوقت","timing.unit.hour":"ساعات","timing.unit.minute":"دقائق","timing.unit.second":"ثوانٍ","timing.zone":"المنطقة الزمنية","timing.zoneNoResults":"لا مناطق زمنية مطابقة","timing.zoneNoStored":"المهمة ذات التنفيذ مرة واحدة تخزّن لحظة الاستهداف فقط، لا منطقة زمنية. يُفسَّر التاريخ والوقت حسب المنطقة الزمنية المحددة.","timing.zoneSearch":"بحث حسب إزاحة UTC أو معرّف IANA أو المدينة","title":"مهام الأتمتة","toast.deleteFailed":"تعذّر حذف المهمة.","toast.deleted":"تم حذف المهمة.","tool.invoked":"تم استدعاء {name}","trigger.label":"التذكيرات","trigger.one":"{count} تذكير","trigger.other":"{count} تذكيرات","unit.day.one":"يوم","unit.day.other":"أيام","unit.hour.one":"ساعة","unit.hour.other":"ساعات","unit.minute.one":"دقيقة","unit.minute.other":"دقائق","unit.second.one":"ثانية","unit.second.other":"ثوانٍ"},"schedule.manager":{"card.deleted":"محذوفة","card.open":"فتح","card.openLabel":"فتح تفاصيل المهمة: {title}","cron.day.both":"اليوم {days} من كل شهر أو {weekdays}{months}","cron.day.bothStarred":"اليوم {days} من كل شهر و{weekdays}{months}","cron.day.every":"كل يوم{months}","cron.day.monthDays":"اليوم {days} من كل شهر{months}","cron.day.weekdays":"{weekdays}{months}","cron.hours.list":"{hours}","cron.hours.range":"{from}–{to}","cron.list.join":"، ","cron.months":" في {months}","cron.part.join":" ","cron.time.at":"عند {times}","cron.time.everyHour":"كل ساعة","cron.time.everyMinute":"كل دقيقة","cron.time.everyMinutes":"كل {step} دقيقة","cron.time.everyNHours":"كل {count} ساعة","cron.time.hourlyAt":"كل ساعة عند الدقيقة {minutes}","cron.time.hoursAt":"عند الدقيقة {minutes} من الساعات {hours}","cron.time.hoursEveryMinute":"كل دقيقة خلال الساعات {hours}","cron.time.hoursEveryMinutes":"كل {step} دقيقة خلال الساعات {hours}","cron.time.joinedEveryHour":"كل ساعة","cron.time.joinedEveryMinute":"كل دقيقة","cron.time.joinedEveryMinutes":"كل {step} دقيقة","cron.time.joinedEveryNHours":"كل {count} ساعة","cron.time.joinedHourlyAt":"كل ساعة عند الدقيقة {minutes}","cron.weekday.name":"{weekday}","cron.weekday.range":"{from}–{to}","cronForm.atMinute":"عند الدقيقة","cronForm.daily":"كل يوم","cronForm.dateOption":"اليوم {day}","cronForm.dates":"في تواريخ محددة","cronForm.frequency":"التكرار","cronForm.minuteDecrease":"تقليل الدقيقة","cronForm.minuteIncrease":"زيادة الدقيقة","cronForm.monthly":"شهريًا","cronForm.weekly":"أسبوعيًا","delete.action":"حذف المهمة","delete.cancel":"إلغاء","delete.close":"إغلاق تأكيد الحذف","delete.confirm":"تأكيد الحذف","delete.description":"يوقف هذا تشغيل المهمة ويحذفها مع سجلات التسليم المحفوظة. تبقى الجلسة الأصلية ورسائلها؛ ولا تُسحب الرسائل الموجودة في قائمة الانتظار.","delete.label":"حذف التذكير: {title}","delete.pending":"جارٍ الحذف…","delete.title":"حذف هذه المهمة؟","delivery.collapse":"طيّ","delivery.cursorError":"تم تحديث السجلات.","delivery.empty":"لا يوجد سجل تسليم متاح","delivery.error":"تعذّر تحميل سجلات التسليم.","delivery.expand":"توسيع","delivery.label":"سجل تسليم محفوظ","delivery.loadMore":"تحميل المزيد","delivery.loading":"جارٍ تحميل سجلات التسليم…","delivery.notFound":"لم تعد هذه المهمة متاحة.","delivery.pruned":"تم مسح سجلات التسليم الأقدم","delivery.refresh":"تحديث","delivery.retention":"قواعد الاحتفاظ","delivery.retentionBounds":"تحتفظ كل مهمة بما يصل إلى {records} من سجلات التسليم خلال آخر {days} يومًا.","delivery.retentionExplanation":"عند حفظ سجل جديد، تُمسح تلقائيًا السجلات الأقدم التي تتجاوز هذه الحدود. ولا يؤدي مسح السجلات إلى إيقاف المهمة.","delivery.retry":"إعادة المحاولة","detail.close":"إغلاق التفاصيل","detail.frequency":"التكرار","detail.id":"معرّف المهمة","detail.instruction":"تعليمات مهمة الأتمتة","detail.label":"تفاصيل المهمة","detail.missing":"المهمة غير متاحة. ربما تم حذفها.","detail.more":"إجراءات مهمة الأتمتة","detail.name":"اسم مهمة الأتمتة","detail.next":"موعد التشغيل التالي","detail.nextRun":"التشغيل التالي","detail.openSession":"الجلسة المرتبطة: فتح الجلسة الأصلية","detail.openSessionTitle":"الجلسة المرتبطة {title}: فتح الجلسة الأصلية","detail.records":"السجلات","detail.rule":"القواعد","detail.session":"الجلسة المرتبطة","detail.sessionArchived":"الجلسة الأصلية مؤرشفة.","detail.sessionLoading":"جارٍ تحميل معلومات الجلسة الأصلية.","detail.sessionUnavailable":"الجلسة الأصلية غير متاحة.","detail.status":"الحالة","detail.tabs":"عروض تفاصيل المهمة","empty.action":"مهمة أتمتة جديدة","frequency.cron":"Cron {expression} ({timeZone})","frequency.cronLocal":"Cron {expression}","frequency.cronRule":"{rule} ({timeZone})","frequency.daily":"يوميًا عند {time} ({timeZone})","frequency.dailyLocal":"يوميًا عند {time}","frequency.every":"كل {value} {unit}","frequency.once":"مرة واحدة","frequency.weekday.1":"الاثنين","frequency.weekday.2":"الثلاثاء","frequency.weekday.3":"الأربعاء","frequency.weekday.4":"الخميس","frequency.weekday.5":"الجمعة","frequency.weekday.6":"السبت","frequency.weekday.7":"الأحد","frequency.weekday.join":"، ","frequency.weekly":"أسبوعيًا يوم {weekdays} عند {time} ({timeZone})","frequency.weeklyLocal":"أسبوعيًا يوم {weekdays} عند {time}","hover.more":"{count} إضافية","list.aria":"التذكيرات النشطة","list.empty":"لا توجد مهام بعد. تظهر هنا المهام التي تُنشأ في جلساتك.","list.emptyInactive":"لا توجد مهام أتمتة غير نشطة","list.error":"تعذّر تحميل المهام.","list.label":"دليل المهام","list.loading":"جارٍ تحميل المهام…","list.nextPrefix":"موعد التشغيل التالي: ","list.nextRun":"التشغيل التالي","list.noMatches":"لا مهام مطابقة","list.open":"فتح تفاصيل التذكير: {title}","list.retry":"إعادة المحاولة","mark.aria":"{count} مهمة مجدولة","new.action":"جديد","panel":"مهام الأتمتة","relative.future":"بعد {value} {unit}","relative.now":"حان الموعد","relative.overdue":"متأخر بـ{value} {unit}","rule.cancel":"إلغاء","rule.cron":"مخصص","rule.cronInvalid":"أدخل تعبير cron من خمسة حقول، مثل 0 9 * * 1-5.","rule.cronLabel":"تعبير Cron","rule.daily":"كل يوم","rule.error.conflict":"تغيّرت هذه المهمة قبل حفظ التحديث. يعرض الصف القاعدة المحفوظة؛ أعد المحاولة.","rule.error.notFound":"لم تعد هذه المهمة متاحة.","rule.error.unknown":"تعذّر تأكيد تحديث القاعدة. يعرض الصف القاعدة المحفوظة.","rule.everyHours":"كل N ساعات","rule.everyMinutes":"كل N دقائق","rule.everySeconds":"كل N ثوانٍ","rule.invalidPrompt":"أدخل تعليمات المهمة.","rule.invalidTitle":"أدخل اسم مهمة لا يتجاوز 120 حرفًا.","rule.once":"مرة واحدة","rule.repeat":"التكرار","rule.save":"حفظ التغييرات","rule.saving":"جارٍ الحفظ…","rule.title":"وقت التشغيل","rule.unsaved":"تغييرات غير محفوظة","rule.weekday":"يوم الأسبوع","rule.weekdayOption":"يوم الأسبوع {weekday}","rule.weekdays":"الاثنين إلى الجمعة","rule.weekly":"أسبوعيًا","rule.zone.system":" (النظام)","search.clear":"مسح البحث","search.label":"بحث في المهام","search.placeholder":"بحث في مهام الأتمتة","status.active":"مشغّلة","status.inactive":"غير نشطة","statusFilter.all":"الكل","statusFilter.label":"حالة المهمة","time.locale":"ar","time.utcPrefix":"UTC","timing.conflict":"تغيّرت هذه المهمة أثناء التعديل. تم الاحتفاظ بمسودتك. ألغِ ثم أعد الفتح بعد التحديث لتعديل أحدث قاعدة.","timing.date":"التاريخ","timing.error":"تعذّر تأكيد تحديث التوقيت. تم الاحتفاظ بمسودتك. تحقق من المهمة قبل إعادة المحاولة.","timing.hour":"الساعة","timing.inactive":"المهام غير النشطة للقراءة فقط. لا يمكن تعديل توقيتها.","timing.interval":"التكرار كل","timing.intervalDecrease":"تقليل الفاصل","timing.intervalHint.hour":"ساعة واحدة على الأقل. يُحسب الفاصل من إنشاء المهمة أو آخر تغيير للقاعدة ولا يعتمد على المناطق الزمنية.","timing.intervalHint.minute":"دقيقة واحدة على الأقل. يُحسب الفاصل من إنشاء المهمة أو آخر تغيير للقاعدة ولا يعتمد على المناطق الزمنية.","timing.intervalHint.second":"60 ثانية على الأقل. يُحسب الفاصل من إنشاء المهمة أو آخر تغيير للقاعدة ولا يعتمد على المناطق الزمنية.","timing.intervalIncrease":"زيادة الفاصل","timing.invalid":"أدخل تاريخًا ووقتًا صالحين، أو تحقق من حقول التوقيت.","timing.invalidInterval":"أدخل فاصلًا لا يقل عن دقيقة واحدة.","timing.invalidInterval.hour":"أدخل فاصلًا لا يقل عن ساعة واحدة.","timing.invalidInterval.minute":"أدخل فاصلًا لا يقل عن دقيقة واحدة.","timing.invalidInterval.second":"أدخل فاصلًا لا يقل عن 60 ثانية.","timing.invalidZone":"أدخل منطقة زمنية IANA صالحة، مثل Asia/Shanghai.","timing.minute":"الدقيقة","timing.nextMonth":"الشهر التالي","timing.notFound":"لم تعد هذه المهمة متاحة. تم الاحتفاظ بمسودتك؛ ألغِ لإغلاق المحرر.","timing.notFuture":"اختر تاريخًا ووقتًا في المستقبل.","timing.prevMonth":"الشهر السابق","timing.second":"الثانية","timing.subagentSession":"تنتمي هذه الجلسة إلى وكيل فرعي، وهو لا يتلقى التذكيرات المُسلَّمة.","timing.time":"الوقت","timing.unit.hour":"ساعات","timing.unit.minute":"دقائق","timing.unit.second":"ثوانٍ","timing.zone":"المنطقة الزمنية","timing.zoneNoResults":"لا مناطق زمنية مطابقة","timing.zoneNoStored":"المهمة ذات التنفيذ مرة واحدة تخزّن لحظة الاستهداف فقط، لا منطقة زمنية. يُفسَّر التاريخ والوقت حسب المنطقة الزمنية المحددة.","timing.zoneSearch":"بحث حسب إزاحة UTC أو معرّف IANA أو المدينة","title":"مهام الأتمتة","toast.deleteFailed":"تعذّر حذف المهمة.","toast.deleted":"تم حذف المهمة.","tool.invoked":"تم استدعاء {name}","trigger.label":"التذكيرات","trigger.one":"{count} تذكير","trigger.other":"{count} تذكيرات","unit.day.one":"يوم","unit.day.other":"أيام","unit.hour.one":"ساعة","unit.hour.other":"ساعات","unit.minute.one":"دقيقة","unit.minute.other":"دقائق","unit.second.one":"ثانية","unit.second.other":"ثوانٍ"},"session-inspector":{"filter.apply":"تطبيق التصفية","filter.cancel":"إلغاء","filter.candidates":"اقتراحات الأنواع","filter.clear":"مسح","filter.context":"السياق الأعلى لسجل مطابق","filter.failed":"تعذّر تحميل اقتراحات الأنواع.","filter.help":"يحتوي على مطابقة (*keyword*). يؤكد Enter؛ ويلغي Esc.","filter.input":"اكتب كلمة مفتاحية","filter.loading":"جارٍ البحث عن اقتراحات…","filter.noCandidates":"لا اقتراحات. لا يزال بإمكانك تطبيق هذه الكلمة المفتاحية.","filter.placeholder":"اكتب جزءًا من النص، مثل delta","filter.title":"تصفية الأنواع","object.absent":"[خانة فارغة]","object.accessor":"[Getter / Setter، غير مُقيَّم]","object.empty":"فارغ","object.group":"مجموعة","object.groupData":"بيانات المجموعة","object.more":"عرض المزيد","object.navigation":"تنقل في البيانات الخام","object.node":"عقدة","object.nodeData":"بيانات العقدة","object.properties":"خصائص أخرى","object.step":"خطوة","object.stepData":"بيانات الخطوة","object.turn":"دورة","object.turnData":"بيانات الدورة","picker.cancel":"إلغاء الالتقاط (Esc)","picker.instructions":"مرّر المؤشر في الدردشة الرئيسية للمعاينة، ثم انقر للاختيار. يلغي Esc.","picker.noChat":"افتح هذه الجلسة في الدردشة الرئيسية قبل الالتقاط.","picker.noMatch":"لا يوجد سجل مطابق في هذا الجدول. التقط عنصرًا آخر أو اضغط Esc للإلغاء.","picker.pick":"التقاط عنصر في عرض الدردشة","tab.description":"تحليل السجلات الخام ورسائل الدردشة المجمّعة للجلسة الحالية في الشريط الجانبي.","tab.title":"سجل الجلسة","table.close":"إغلاق","table.collapse":"طيّ العناصر الفرعية","table.data":"البيانات","table.empty":"لا سجلات","table.expand":"توسيع العناصر الفرعية","table.id":"الفهرس","table.latest":"متابعة الأحدث","table.loading":"جارٍ التحميل…","table.location":"T/S","table.older":"تحميل الأقدم","table.raw":"بيانات خام","table.rawError":"تعذّر تسلسل هذا السجل. اختر سجلًا آخر للمتابعة.","table.removed":"تمت إزالة هذا السجل أو اكتماله. اختر سجلًا حاليًا.","table.resizeDetails":"تغيير حجم لوحة البيانات الخام","table.time":"الوقت (UTC)","table.type":"النوع","view.chatNode":"مجموعة الدردشة","view.presentation":"العرض","view.sessionLog":"السجل الخام"},"session-log-download":{"dialog.close":"إغلاق","dialog.commandFailed":"تعذّر بدء تصدير الجلسة.","dialog.errorTitle":"فشل تصدير الجلسة","dialog.preparingDescription":"جارٍ تحضير ملف ZIP يضم هذه الجلسة وجلساتها الفرعية ومرفقاتها.","dialog.preparingTitle":"جارٍ تصدير الجلسة","dialog.successDescription":"يقوم المتصفح بتنزيل ملف ZIP للجلسة.","dialog.successTitle":"بدأ تنزيل الجلسة","header.more":"إجراءات إضافية","menu.download":"تنزيل سجل الجلسة","menu.feedback":"ملاحظات"},"settings":{"close":"إغلاق","connection.connected":"متصل","connection.connecting":"جارٍ إعادة الاتصال","connection.error":"غير متصل","connection.reconnect":"غير متصل، أعد الاتصال الآن","connection.restart":"جارٍ إعادة الاتصال، أعد الاتصال الآن","desktop.update.available":"تحديث","desktop.update.checkFailed":"تعذّر التحقق من التحديثات. حاول مرة أخرى لاحقًا.","desktop.update.checkNetworkFailed":"تعذّر التحقق من التحديثات. تحقق من اتصالك وحاول مرة أخرى.","desktop.update.checking":"جارٍ التحقق من التحديثات…","desktop.update.downloadDetail":"جارٍ تنزيل التحديث: {percent}%\nالإصدار الهدف: {version}","desktop.update.downloadFailed":"تعذّر تنزيل التحديث. حاول مرة أخرى.","desktop.update.downloadNetworkFailed":"تعذّر تنزيل التحديث. تحقق من اتصالك وحاول مرة أخرى.","desktop.update.installFailed":"تعذّر تثبيت التحديث. حاول مرة أخرى لاحقًا.","desktop.update.installNetworkFailed":"تعذّر تثبيت التحديث. تحقق من اتصالك وحاول مرة أخرى.","desktop.update.installing":"جارٍ التحضير لإعادة التشغيل…","desktop.update.progress":"{percent}%","desktop.update.ready":"تثبيت وإعادة التشغيل","desktop.update.retry":"إعادة محاولة التحديث","desktop.update.stopFailed":"تعذّر إيقاف المهام بأمان. لم يتم تثبيت التحديث. حاول مرة أخرى لاحقًا.","desktop.update.tasksChanged":"بدأت مهام جديدة. أكّد مرة أخرى لإيقاف المهام والتحديث.","desktop.update.tasksUnavailable":"حالة المهام غير متاحة. حاول التحديث مرة أخرى عندما تصبح مساحة العمل جاهزة.","desktop.update.verifying":"جارٍ التحقق من ملفات التحديث…","desktop.update.versionDetail":"{label}: {version}","developerTools.description":"يعرض المسار وفروق الكود وكل الإعدادات المسبقة للوكيل","developerTools.error":"تعذّر الحفظ. حاول مرة أخرى.","developerTools.title":"عرض واجهة البرمجة","general.currentVersion":"الإصدار الحالي: {version}","general.nav":"عام","openDocument":"فتح ملف الإعدادات","openDocument.error":"تعذّر فتح ملف الإعدادات","shortcut.open":"فتح الإعدادات","title":"الإعدادات","trigger":"الإعدادات"},"settings.account":{"accountInfo":"مزيد من معلومات الحساب","addApiKey":"إضافة مفتاح API","backToHarness":"العودة إلى DeepSeek Harness","balance":"الرصيد المشحون","balanceSignedOut":"سجّل الدخول للعرض","balanceUnavailable":"العرض على المنصة","bonusBalance":"الرصيد الممنوح","bonusNoticeTitle":"أُضيفت المكافأة","browserDescription":"، ثم افتحه في المتصفح لإكمال تسجيل الدخول.","browserPrompt":"لم تُفتح الصفحة تلقائيًا؟ ","browserTitle":"في انتظار تسجيل الدخول","cancel":"إلغاء","close":"إغلاق","completing":"جارٍ إكمال تسجيل الدخول…","contactUs":"ملاحظات","copiedLink":"تم نسخ الرابط","copyFailed":"فشل النسخ","copyLink":"نسخ رابط تسجيل الدخول","expired":"انتهت مدة تسجيل الدخول. أعد المحاولة.","failed":"تعذّر إكمال العملية. أعد المحاولة.","failureTitle":"تعذّر تسجيل الدخول","initializing":"جارٍ بدء تسجيل الدخول…","loading":"جارٍ التحميل…","loginDescription":"سجّل الدخول إلى حساب DeepSeek أو أضف مفتاح API للبدء. تُخزَّن مشاريعك وملفاتك محليًا.","loginTitle":"ابدأ الآن","menu":"قائمة الحساب","modelSignInRequired":"الموديل غير متاح. سجّل الدخول ثم أعد المحاولة.","more":"المزيد","nav":"الحساب","noResponse":"حدث خطأ ما. تحقق من اتصال الشبكة ثم أعد المحاولة.","onboardingArtworkLocale":"en","onboardingBack":"رجوع","onboardingBrand":"DeepSeek Harness","onboardingCompact":"النتائج فقط","onboardingCompactDescription":"اعرض النتائج فقط في واجهة بسيطة وواضحة","onboardingContinue":"متابعة","onboardingCredit":"إضافة رصيد","onboardingCreditDescription":"يخصم DeepSeek Harness رصيدًا بناءً على التوكنات التي تستخدمها الموديلات والأدوات. أضف رصيدًا مسبقًا لتبقى مهامك قيد التنفيذ دون انقطاع. ولا يُستخدم رصيدك إلا أثناء عمل الوكيل على مهمة.","onboardingDetailed":"كل التفاصيل","onboardingDetailedDescription":"اعرض العملية كاملة لتبسيط تصحيح الأخطاء وحل المشكلات","onboardingDevelopment":"البرمجة والتطوير","onboardingDevelopmentDescription":"عدّل الكود، وصحّح الأخطاء، وشغّل الأوامر، وأدر ملفات المشروع، والمزيد","onboardingEnter":"فتح التطبيق","onboardingFundedTopUp":"إضافة رصيد","onboardingGoTopUp":"إضافة رصيد","onboardingIntroduction":"يعمل DeepSeek Harness في مجلد محلي ويستخدم أدوات لقراءة الملفات وكتابتها على حاسوبك. ويمكنه مساعدتك في البحث عن المعلومات وتنظيمها، وإنشاء المستندات وجداول البيانات، وكتابة الكود، وحل المشكلات، والمزيد.","onboardingKeepSetting":"متابعة الإعداد","onboardingLater":"التالي","onboardingLoading":"جارٍ تحميل الإعدادات…","onboardingNoCreditDescription":"لا يمكن لـ DeepSeek Harness بدء مهام جديدة دون رصيد. ويمكنك إضافته لاحقًا من الإعدادات → الحساب.","onboardingNoCreditTitle":"هل تريد تخطي إضافة الرصيد؟","onboardingOffice":"أعمال المكتب والإبداع","onboardingOfficeDescription":"حرّر المستندات، ونظّم البيانات، وأنشئ العروض التقديمية، والمزيد","onboardingProcess":"ما مقدار التفاصيل التي تريد عرضها؟","onboardingProcessDescription":"يغيّر هذا طريقة عرض التقدّم فقط، لا ما يستطيع DeepSeek Harness فعله.","onboardingPurposeDescription":"سنضبط الواجهة والأدوات لتناسب طريقة عملك.","onboardingPurposePrefix":"ما الذي تريد","onboardingPurposeSuffix":"المساعدة فيه؟","onboardingRetry":"إعادة المحاولة","onboardingSaveFailed":"تعذّر حفظ الإعدادات. أعد المحاولة.","onboardingSkip":"تخطي","onboardingSkipDescription":"يمكنك تغيير طريقة عرض التقدّم والأداء والاستخدام، أو تشغيل أدوات البرمجة، في أي وقت من الإعدادات → عام.","onboardingSkipTitle":"هل تريد تخطي الإعداد؟","onboardingStandard":"التفاصيل الأساسية","onboardingStandardDescription":"التركيز على النتائج مع عرض أهم الخطوات والإجراءات فقط","onboardingStart":"ابدأ الآن","onboardingTopUp":"إضافة رصيد","onboardingUnderstood":"فهمت","onboardingWelcome":"مرحبًا بك في","open":"فتح المتصفح","platformFailed":"تعذّر إكمال العملية. أعد المحاولة.","platformRetry":"إعادة المحاولة","profileUnavailable":"تفاصيل الحساب غير متاحة بعد.","quotaDescription":"لا يستطيع DeepSeek Harness بدء مهمة جديدة بهذا الحساب عند عدم توفر رصيد. هل تريد إضافة رصيد؟ ويمكنك أيضًا إضافته لاحقًا من الإعدادات → الحساب.","quotaTitle":"لا يوجد رصيد متاح","quotaTopUp":"إضافة رصيد","retry":"تسجيل الدخول مجددًا","sessionExpired":"لقد سجّلت الخروج من حسابك، يرجى تسجيل الدخول مجددًا.","settings":"الإعدادات","settingsSignedOutDescription":"سجّل الدخول إلى DeepSeek Harness للحصول على مفتاح API المخصص لك","settingsSignedOutTitle":"أنت غير مسجّل الدخول إلى DeepSeek Harness","signIn":"تسجيل الدخول","signInDescription":"استخدم حساب DeepSeek للبدء.","signOut":"تسجيل الخروج","signOutDescription":"لن يؤدي تسجيل الخروج إلى حذف أي بيانات. ويمكنك تسجيل الدخول إلى هذا الحساب مجددًا.","signOutRunningDescription":"هناك مهام قيد التنفيذ حاليًا. سيؤدي تسجيل الخروج إلى مقاطعتها. هل تريد تسجيل الخروج الآن؟","signOutUnknownDescription":"تعذّر التحقق من المهام قيد التنفيذ. قد يؤدي تسجيل الخروج إلى مقاطعة مهام تستخدم هذا الحساب. هل تريد تسجيل الخروج الآن؟","signedIn":"مسجّل الدخول إلى DeepSeek","signedOut":"غير مسجّل الدخول","timeoutDescription":"سجّل الدخول مجددًا للمتابعة.","timeoutTitle":"انتهت مهلة تسجيل الدخول","topUp":"إضافة رصيد","usage":"عرض الاستخدام","waiting":"تابع في متصفحك"},"settings.agentLoop":{"description":"تحكّم في طريقة إرسال الوكيل لاستدعاءات الأدوات.","invalidNumber":"أدخل رقمًا، أو اتركه فارغًا لاستخدام القيمة الافتراضية.","maxParallel":"استدعاءات الأدوات المتوازية","maxParallelHint":"الحد الأعلى للاستدعاءات الآمنة التوازي التي تعمل في الوقت نفسه خلال خطوة واحدة.","overridden":"متجاوَز","readOnly":"يخزّن هذا النشر الإعدادات للقراءة فقط.","reset":"إعادة إلى الافتراضي","save":"حفظ","saveFailed":"لم يقبل النشر هذه القيم؛ تُركت لك لتصحيحها.","saving":"جارٍ الحفظ…","title":"حلقة الوكيل","unavailable":"لم يتم تحميل هذا البلاقن، لذا لا يمكن إعداده الآن."},"settings.agentPreset":{"guideCopied":"تم النسخ","guideCopy":"نسخ","guideCordisExplanation":"### ما الذي يمكنك إنشاؤه\n\nيتضمن وضع المنشئ أدوات المهام القياسية إضافةً إلى فحص وقت التشغيل، وإدارة البلاقنات الدائمة، وإرشادات لكتابة بلاقنات Cordis وإعدادات الوكيل المسبقة. ويمكنه إنشاء بلاقن يضيف قدرة أو واجهة، أو إعداد مسبق يجمع الأدوات والطلبات لمهمة معينة.\n\n### البلاقنات والأوضاع\n\nيضيف البلاقن قدرات إلى DSH، مثل أداة أو اتصال خدمة أو مدخل في الواجهة. والوضع هو إعداد مسبق للوكيل يختار الأدوات ويحدد كيفية عمل الوكيل في مهمة. ويمكن تضمين بلاقن في إعداد مسبق مخصص.\n\n### كيف يسري الناتج\n\nاطلب من الوكيل تثبيت الناتج والتحقق منه، لا مجرد توليد الكود المصدرية. وقد يُحمَّل البلاقن فورًا أو يتطلب إعادة تشغيل، حسب ما يغيّره. ويُختار الإعداد المسبق المُنشأ حديثًا عند بدء مهمة جديدة.","guideCordisIntro":"اختر وضع المنشئ لمهمة جديدة. صِف القدرة التي تريدها، ومكان ظهورها، وكيفية التحقق منها.","guideCordisUsage":"### إضافة واجهة\n\n> أنشئ بلاقن DSH يضيف مدخل ملاحظات المشروع إلى الشريط الجانبي. أتح لي تصفح ملفات Markdown في مساحة العمل هذه ومعاينة ملاحظة مختارة. ثبّته وتحقق من فتح الصفحة.\n\nالناتج المتوقع: بلاقن مثبَّت مع مدخل يعمل وصفحة معاينة، إضافةً إلى أي خطوات تفعيل متبقية.\n\n### إضافة أداة\n\n> أنشئ بلاقنًا يتضمن أداة تقرأ تقرير اختبارات هذا المشروع وتلخّص الاختبارات الفاشلة. سجّلها وتحقق منها باستخدام تقرير تجريبي.\n\nالناتج المتوقع: بلاقن بأداة قابلة للاستدعاء واستدعاء تجريبي تم التحقق منه.\n\n### إنشاء وضع خاص بي\n\n> أنشئ وضع «مراجعة الكود» استنادًا إلى الوضع القياسي. اجعله يعطي الأولوية للأخطاء المحتملة وثغرات الاختبارات، ويستشهد بمسارات الملفات وأسطرها، ويسأل قبل تعديل الملفات. واحفظه كإعداد مسبق قابل للاختيار.\n\nالناتج المتوقع: إعداد مسبق مخصص للمهام الجديدة. توجّه تعليمات المراجعة هذه الوكيل؛ وتحدد إعدادات الصلاحيات الإجراءات التي يمكنه تنفيذها.","guideExampleTask":"مثال على مهمة","guideFootnotes":"الحواشي","guideMinimalExplanation":"### ما الذي يتضمنه\n\nأداة طرفية واحدة دائمة وطلب نظام ثابت. ولا يحمّل الإعداد المسبق المضمّن المهارات أو التخطيط أو ضغط السياق أو سياق وقت التشغيل القياسي.\n\n### متى تختاره\n\nاستخدمه كخط أساس للتجارب والمقارنات. ولا يزال بإمكانه قراءة الملفات وتنفيذ النصوص البرمجية عبر أوامر الطرفية، لكنه يوفر طرقًا مضمّنة أقل لإدارة مهمة طويلة. وقلة الأدوات لا تعني بالضرورة سهولة أكبر للمبتدئ.","guideMinimalIntro":"اختر الوضع المبسّط لمهمة جديدة. ولإجراء مقارنة، أبقِ الموديل والصلاحيات والمدخلات وحالة مساحة العمل الابتدائية ثابتة في جميع التشغيلات.","guideMinimalUsage":"### مقارنة الأداء في إصلاح خطأ بسيط\n\n> شغّل اختبارات هذا المشروع، وابحث عن سبب الفشل، ونفّذ أصغر إصلاح ممكن. ثم شغّل الاختبارات المعنية مجددًا وأبلغ بالنتيجة.\n\nشغّل المهمة نفسها منفصلةً في الوضع القياسي والوضع المبسّط من الحالة الابتدائية نفسها. وقارن إنجاز المهمة واستدعاءات الأدوات والتغييرات الناتجة. وينفّذ الوضع المبسّط العمل عبر أوامر الطرفية.","guidePtcExplanation":"### كيفية استدعاء الأدوات\n\nPTC تعني الاستدعاء البرمجي للأدوات. وفي هذا الإعداد المسبق المضمّن، يستخدم الوكيل run_code لكتابة برنامج TypeScript يستدعي الأدوات عبر SDK مُولَّد. ويمكن للبرنامج استخدام الحلقات والشروط ومعالجة الأخطاء والاستدعاءات المتزامنة عند الحاجة.\n\n### ما الذي يصل إلى الموديل\n\nتصل نتائج الأدوات أولًا إلى البرنامج، الذي يمكنه تصفيتها ودمجها. ويتلقى الموديل ما يطبعه البرنامج أو يعيده؛ أما نتائج الصور فتُرفق بشكل منفصل. ولا تزال استدعاءات الأدوات المتداخلة مسجّلة وتخضع لصلاحيات الأدوات.\n\n### مقارنةً بالوضع القياسي\n\nيمكن للوضعين التعامل مع مهام البرمجة والمهام الدفعية. يعرض الوضع القياسي الأدوات الفردية مباشرةً؛ بينما ينظّم PTC استدعاءات الأدوات في الكود. ويترك الإعداد المسبق الحالي لـ PTC أداة سير العمل معطّلة. وتعتمد السرعة واستهلاك التوكنات على المهمة وطريقة تعامل البرنامج مع نتائجها.","guidePtcIntro":"اختر وضع PTC عند بدء مهمة جديدة. وحدّد ملفات الإدخال وقواعد المعالجة وصيغة الإخراج. ويكتب الوكيل الكود.","guidePtcUsage":"### فحص مجموعة من ملفات الإعداد\n\n> افحص كل ملفات JSON في configs/. واذكر الحقول المطلوبة الناقصة والقيم غير الصالحة مقارنةً بـ schema.json. واحفظ ملف CSV بسطر واحد لكل مشكلة. وأدرج الملفات غير القابلة للقراءة في التقرير وتابع فحص الباقي. واترك الملفات الأصلية دون تغيير.\n\nالناتج المتوقع: ملخص للمشكلات وتقرير CSV. ويمكن للبرنامج تكرار الفحوص نفسها ومعالجة الإخفاقات الفردية وجمع النتائج.\n\n### تلخيص سجلات الأخطاء\n\n> حلّل ملفات السجل في logs/. وجمّع الأخطاء حسب الخدمة ونوع الخطأ. واعرض أكثر عشرة مجموعات تكرارًا ومثالًا واحدًا من كل مجموعة. واحفظ الأعداد الكاملة في ملف CSV.\n\nالناتج المتوقع: أهم مجموعات الأخطاء وجدول أعداد كامل. ويمكن تجميع البيانات الوسيطة في البرنامج قبل وصول الملخص إلى الموديل.","guideSections":"أقسام الدليل","guideStandardExplanation":"### كيف يعمل\n\nيستدعي الوكيل الأدوات مباشرةً لقراءة الملفات وتعديلها، والبحث، وتشغيل أوامر الطرفية. ويتضمن المهارات والتخطيط والأهداف والوكلاء الفرعيين وسير العمل وضغط السياق.\n\n### متى تختاره\n\nابدأ به للبرمجة اليومية والعمل على الملفات والبحث. ويستطيع الوضع القياسي أيضًا كتابة النصوص البرمجية ومعالجة الملفات دفعةً واحدة. ويغيّر PTC طريقة تنظيم استدعاءات الأدوات؛ وهو ليس ضروريًا للمهام الدفعية.","guideStandardIntro":"اختر الوضع القياسي عند بدء مهمة جديدة. صِف ما تريد إنجازه، وأشِر إلى الملفات المعنية، واشرح كيفية التحقق من النتيجة.","guideStandardUsage":"### إصلاح خطأ\n\n> اكتشف سبب اختفاء النتائج عند إرسال نموذج البحث مرتين. أصلح المشكلة وشغّل الاختبارات المعنية. واشرح السبب وما تغيّر.\n\nالناتج المتوقع: تغيير في الكود، ونتائج الاختبارات المعنية، وشرح للسبب.\n\n### تنظيم ملاحظات المشروع\n\n> اقرأ ملاحظات Markdown في هذا المشروع. ولخّص القرارات المتفق عليها والأسئلة المفتوحة، مع روابط إلى الملفات المصدرية.\n\nالناتج المتوقع: ملخص مع مراجع يمكنك مقارنتها بالملاحظات الأصلية.","howToUse":"كيفية الاستخدام","modeExplanation":"تفاصيل الوضع"},"settings.locale":{"back":"رجوع","brand.localBuild":"نسخة DSH المحلية","cancel":"إلغاء","close":"إغلاق","codeBlock.title":"كتلة كود","codeBlock.unwrap":"عدم التفاف الأسطر","codeBlock.wrap":"التفاف الأسطر","collapse":"طيّ","copied":"تم النسخ","copy":"نسخ","copy.compactJson":"نسخ JSON المضغوط","copy.failed":"فشل النسخ","copy.json":"نسخ JSON","copy.optionsHint":"{action}؛ انقر بزر الفأرة الأيمن لخيارات النسخ","copy.path":"نسخ مسار الخاصية","copy.prettyJson":"نسخ JSON المنسّق","copy.value":"نسخ القيمة","delete":"حذف","edit":"تعديل","expand":"توسيع","json.label":"JSON","language.title":"اللغة","load.failed":"فشل التحميل","loading":"جارٍ التحميل…","markdown.footnotes":"الحواشي","markdown.truncatedCharacters":"… تم الاقتطاع عند {total} حرفًا","more":"المزيد","next":"التالي","none":"لا شيء","number.million":"{value}M","number.thousand":"{value}K","ok":"موافق","previous":"السابق","retry":"إعادة المحاولة","save":"حفظ","search":"بحث","skip":"تخطي","submit":"إرسال","submitting":"جارٍ الإرسال…","truncated":"مقتطع","unknown":"غير معروف","workspace.defaultName":"مساحة العمل الافتراضية"},"settings.models":{"add":"إضافة مزوّد","addCatalog":"مزوّد موديلات خارجي","addCatalogExhausted":"تم إعداد كل مزوّد في الكتالوج بالفعل.","addCatalogHint":"اختر OpenAI أو Anthropic أو Kimi أو مزوّدًا آخر من الكتالوج المضمّن، ثم أدخل مفتاح API الخاص به.","addCustom":"API موديل مخصّص","addCustomHint":"اربط خدمة وسيطة أو خادمًا مستضافًا ذاتيًا أو أي نقطة نهاية متوافقة مع OpenAI أو Anthropic عبر عنوان URL الأساسي والبروتوكول والموديلات.","addCustomUnavailable":"لا يتوفر أي بروتوكول API للإعلان عنه.","addMode":"طريقة الإضافة","addModel":"إضافة موديل","advancedHint":"توجد الحقول الأخرى في cordis.patch.yml؛ عدّل ذلك القسم مباشرةً.","apply":"تطبيق","applying":"جارٍ التطبيق…","baseUrl":"عنوان URL الأساسي","baseUrlDefault":"افتراضي المزوّد","cancel":"إلغاء","close":"إغلاق","conflict":"غيّر شخص آخر هذه الإعدادات أثناء فتح هذه البطاقة. أغلقها وأعد فتحها لتعديل القيم الحالية.","contextWindow":"نافذة السياق","contextWindowPlaceholder":"يستخدم افتراضي المزوّد","create":"إنشاء مزوّد","creating":"جارٍ الإنشاء…","credentialConfigured":"مفتاح API مُعدّ","credentialMissing":"مفتاح API مفقود","customAnthropicBaseUrlPlaceholder":"https://gateway.example","customApi":"بروتوكول API","customApiUnset":"غير محدد","customBaseUrlInvalid":"أدخل عنوان URL صالحًا عبر HTTP أو HTTPS.","customBaseUrlPlaceholder":"https://gateway.example/v1","customDisplayName":"اسم العرض","customNeedsBaseUrl":"يحتاج المزوّد المخصص إلى عنوان URL أساسي.","customNeedsModels":"يحتاج المزوّد المخصص إلى موديل واحد على الأقل.","customRoute":"معرّف المزوّد","customRouteHint":"معرّف بأحرف صغيرة يبدأ بحرف، ويسمّي هذا المزوّد بشكل فريد في الطلبات وكاسم اعتماده.","customRouteInvalid":"ابدأ بحرف صغير؛ ثم أحرف صغيرة وأرقام وشرطات.","customRouteTaken":"يستخدم مزوّد هذا المعرّف بالفعل.","customTag":"مخصص","customized":"إعدادات مخصصة","deepSeekAccount":"حساب DeepSeek","deepSeekBaseUrl":"https://api.deepseek.com/anthropic","deepSeekEndpointHint":"استخدم نقطة نهاية API متوافقة مع Anthropic Messages.","deleteConfirm":"حذف {provider}","deleteDescription":"يؤدي حذف {provider} إلى إزالة إعداده. أما أي اعتماد يستخدمه فيُدار في مكان آخر وسيُحتفظ به.","deleteDescriptionWithCredential":"يؤدي حذف {provider} إلى إزالة إعداده ومفتاح API المخزّن.","deleteTitle":"حذف {provider}؟","deleting":"جارٍ حذف {provider}…","edit":"تعديل","editProvider":"تعديل {provider}","fetchAdopt":"إضافة المحدد","fetchDescription":"هذه هي الموديلات المتاحة لدى هذا المزوّد. اختر ما تريد إضافته.","fetchDeselectAll":"إلغاء تحديد الكل","fetchEmpty":"لم يُدرج المزوّد أي موديلات. أضفها يدويًا.","fetchModels":"جلب الموديلات المتاحة","fetchNeedsBaseUrl":"أدخل عنوان URL الأساسي أولًا، ثم اجلب.","fetchNoMatches":"لا توجد موديلات مطابقة.","fetchSearch":"بحث في الموديلات","fetchSelectAll":"تحديد الكل","fetchTitle":"اختر الموديلات المراد إضافتها","fetching":"جارٍ الاستعلام من المزوّد…","intro":"أدخل مفاتيح API لاستخدام موديلات المزوّدين التاليين.","keyBlank":"أدخل مفتاح API، أو اترك الحقل فارغًا للاحتفاظ بالمفتاح المخزّن.","keyBlankNew":"أدخل مفتاح API، أو اترك الحقل فارغًا إذا كان هذا المزوّد يستخدم طريقة مصادقة أخرى.","keyEnvLocked":"مُوفَّر من بيئة التشغيل (للقراءة فقط)","keyIllegalCharacters":"صيغة مفتاح API هذا غير صالحة. يرجى التحقق منه.","keyInput":"مفتاح API","keyPlaceholder":"أدخل مفتاح API الخاص بك","keyPlaceholderNative":"أدخل مفتاح API، أو اتركه فارغًا لاستخدام مصادقة البيئة","keyRequired":"أدخل مفتاح API للمتابعة.","keyStored":"مُعدّ — أدخل قيمة جديدة للاستبدال","loadFailed":"فشل تحميل دليل المزوّدين","maxTokens":"الحد الأقصى لتوكنات الإخراج","maxTokensPlaceholder":"يستخدم افتراضي المزوّد","model":"الموديل","modelAdvanced":"خيارات الموديل","modelCapacityInvalid":"يجب أن تكون السعة رقمًا، مع لاحقة K أو M اختياريًا.","modelContextInvalid":"يجب أن تكون نافذة السياق عددًا موجبًا، مثل 131072 أو 256K أو 1M.","modelDuplicate":"يمكن أن يظهر معرّف كل موديل مرة واحدة.","modelId":"معرّف الموديل","modelIdDuplicate":"يجب أن يكون معرّف الموديل فريدًا.","modelIdRequired":"معرّف الموديل مطلوب.","modelInputImage":"صورة","modelInputText":"نص","modelInputTypes":"أنواع الإدخال","modelMaxTokensInvalid":"يجب أن يكون الحد الأقصى لتوكنات الإخراج عددًا موجبًا، مثل 8192 أو 64K أو 1M.","modelName":"اسم العرض","modelNameInvalid":"لا يمكن أن يكون اسم العرض فارغًا.","modelNamePlaceholder":"يستخدم معرّف الموديل عند تركه فارغًا","models":"الموديلات","modelsCustomized":"كتالوج موديلات مخصص","modelsEmpty":"لن يُعرض أي موديل في القائمة. ويمكن مع ذلك إرسال المعرّفات غير المدرجة مباشرةً.","modelsInherited":"استخدام افتراضيات المحوّل","nav":"الموديلات","onboardingDescription":"أعدّ مزوّد DeepSeek الرسمي لبدء العمل.","onboardingLater":"الإعداد لاحقًا","onboardingSave":"حفظ ومتابعة","onboardingSaving":"جارٍ الحفظ…","onboardingTitle":"أضف مفتاح API للبدء","protocolAnthropicMessages":"Anthropic Messages","protocolOpenAiCompletions":"OpenAI Chat Completions","protocolOpenAiResponses":"OpenAI Responses","provider":"المزوّد","readOnly":"مستند الإعدادات للقراءة فقط في هذا النشر.","remove":"حذف","removeModel":"حذف موديل","removeProvider":"حذف {provider}","resetModels":"استعادة الافتراضيات","retry":"إعادة المحاولة","savedProvider":"تم حفظ {provider}.","settingsPathUnresolvable":"مسار إعدادات غير قابل للتحديد","title":"الموديلات","welcomeBody":"لا يزال DeepSeek Harness 0.2 في مرحلة المعاينة، وتحتاج جوانب كثيرة إلى تحسين وصقل مستمرين. ونرحّب بملاحظات جميع المطوّرين والمستخدمين واقتراحاتهم. ويستهدف تطبيق سطح المكتب الجديد الآن مجموعة واسعة من المستخدمين، بينما يمكن تشغيل الميزات المتقدمة الخاصة بالمطوّرين من الإعدادات. ومن المتوقع أن تستمر ميزات منتج DeepSeek Harness وواجهات API الخاصة بالبلاقنات في التطوير والتحديث السريع، وأن تستقر تدريجيًا مع الوقت.\n\nونتطلع إلى استكشاف حدود الذكاء مع المستخدمين والمطوّرين حول العالم، بالبناء على بنية مفتوحة المصدر وقابلة لإعادة الاستخدام والتركيب. ونرحّب بالجميع لتحويل أفكارهم إلى واقع مع DeepSeek Harness والمشاركة في المجتمع لإثراء منظومة البلاقنات.","welcomeContinue":"متابعة","welcomeError":"تعذّر حفظ الإقرار. يرجى المحاولة مجددًا.","welcomeTitle":"إشعار المعاينة"},"settings.permission":{"confirm.acknowledge":"أفهم المخاطر وأريد المتابعة","confirm.cancel":"إلغاء","confirm.description":"تتيح الصلاحية الكاملة للجلسات الجديدة تقليل خطوات التأكيد وتنفيذ مزيد من الإجراءات مباشرةً، بما في ذلك العمليات الحساسة أو تغييرات الملفات أو الأوامر الخارجية. لا تستخدمها إلا عندما تثق بالمهام اللاحقة.","confirm.enable":"تشغيل الصلاحية الكاملة","confirm.title":"هل تريد تشغيل الصلاحية الكاملة؟","description":"اختر وضع الصلاحيات الافتراضي للجلسات الجديدة","loading":"جارٍ التحميل","preset.fullAccess":"صلاحية كاملة","preset.readOnly":"قراءة فقط","preset.workspaceWrite":"كتابة في مساحة العمل","title":"الصلاحيات","unavailable":"غير متاح"},"settings.pluginInventory":{"active":"قيد التشغيل","clientSyncFailed":"تعذّرت مزامنة بعض البلاقنات في هذه الصفحة. ولم يتغيّر التمكين في المضيف.","clientSyncRetry":"إعادة محاولة هذه الصفحة","clientSyncing":"جارٍ مزامنة البلاقنات في هذه الصفحة…","condition":"يُعطَّل عند","conditionalTag":"مشروط","configuration":"التهيئة","countUnit":"بلاقنات","disabledTag":"معطّل","empty":"لا تتوفر أي بلاقنات.","emptySearch":"لا توجد بلاقنات مطابقة.","enabledIn":"ممكّن في","enabledTag":"ممكّن","error":"البلاقنات غير متاحة مؤقتًا.","failed":"فشل البدء","failedCountLabel":"فاشل","failedTag":"فشل","fromPreset":"من","globalSubtitle":"مشتركة بين النظام وكل جلسة","globalTitle":"بلاقنات عامة","loading":"جارٍ قراءة البلاقن…","loadingPhase":"جارٍ التحميل","matchesInOtherPresets":"{count} من التطابقات الإضافية في إعدادات مسبقة أخرى: ","metadataError":"خطأ في بيانات الحزمة الوصفية: {error}","moduleLabel":"الوحدة","pending":"في انتظار التبعيات","presetEnabledTag":"عبر الإعدادات المسبقة","presetOptionBroken":"{name} (فشل التحميل)","presetOptionDefault":"{name} (افتراضي)","presetProvidedDetail":"معطّل عمومًا؛ وتوفّره الإعدادات المسبقة للوكيل لكل جلسة","presetSubtitle":"تُركَّب لكل جلسة عبر الإعدادات المسبقة للوكيل","presetTitle":"بلاقنات الجلسة","retry":"إعادة المحاولة","runtime":"الحالة","search":"بحث في البلاقنات","switcherLabel":"اختر الإعداد المسبق للوكيل لفحصه","tab":"قائمة البلاقنات","unloading":"جارٍ إلغاء التحميل","unobserved":"غير قيد التشغيل","viewInPreset":"عرض في مجموعة الإعداد المسبق"},"settings.plugins":{"empty":"لا يعرض هذا النشر أي طرق عرض للبلاقنات.","intro":"افحص البلاقنات المضمّنة في هذا النشر.","nav":"البلاقنات المضمّنة","tabs":"طرق عرض البلاقنات","title":"البلاقنات المضمّنة"},"settings.sessionLog":{"description":"ساعد في تحسين موديلات DeepSeek ومنتجاتها.","failed":"تعذّر حفظ التفضيل","saved":"تم حفظ التفضيل","title":"رفع سجل الجلسة عند استخدام API الموديل الرسمي"},"settings.shell":{"description":"حدّد مدة تشغيل كل أمر وحجم إخراجه.","invalidNumber":"أدخل رقمًا، أو اتركه فارغًا لاستخدام القيمة الافتراضية.","maxOutputBytes":"حد الإخراج لكل تدفق (بايت)","maxOutputBytesHint":"يُكتب الإخراج الزائد عن هذا الحد في ملف مؤقت بدلًا من فقدانه.","overridden":"متجاوَز","readOnly":"يخزّن هذا النشر الإعدادات للقراءة فقط.","reset":"إعادة إلى الافتراضي","save":"حفظ","saveFailed":"لم يقبل النشر هذه القيم؛ تُركت لك لتصحيحها.","saving":"جارٍ الحفظ…","timeoutMs":"مهلة الأمر (ms)","timeoutMsHint":"المدة التي يمكن أن يعملها الأمر قبل إنهائه.","title":"الطرفية","unavailable":"لم يتم تحميل هذا البلاقن، لذا لا يمكن إعداده الآن."},"settings.subagent":{"overridden":"متجاوَز","readOnly":"يخزّن هذا النشر الإعدادات للقراءة فقط.","reset":"إعادة إلى الافتراضي","save":"حفظ","saveFailed":"لم يقبل النشر هذه القيم؛ تُركت لك لتصحيحها.","saving":"جارٍ الحفظ…","subagentCapacityHelp":"إجمالي الوكلاء الفرعيين النشطين تحت الوكيل الرئيسي نفسه، عبر جميع مستويات التعاقب. ولا يُحتسب الوكيل الرئيسي. وتُرفض طلبات البدء الجديدة عند بلوغ الحد.","subagentCapacityHelpLabel":"حول حد التوازي للوكلاء الفرعيين","subagentCapacityInvalid":"أدخل عددًا صحيحًا يساوي 1 أو أكثر.","subagentDepthHelp":"يحدد عدد مستويات الوكلاء الفرعيين التي يمكن للوكيل إنشاؤها.","subagentDepthHelpLabel":"حول الحد الأقصى لعمق التعاقب","subagentDepthInvalid":"أدخل عددًا صحيحًا يساوي 0 أو أكثر.","subagentDepthOne":"الوكيل الرئيسي وحده يمكنه إنشاء وكلاء فرعيين","subagentDepthOverride":"إذا حدّدت أداة حدًا أقصى خاصًا بها لعمق التعاقب، فتكون له الأولوية.","subagentDepthZero":"إيقاف الوكلاء الفرعيين","subagentDescription":"حدّد عمق التعاقب وعدد الوكلاء الفرعيين وموديلاتها.","subagentLimitsTitle":"الحدود","subagentMaxActive":"حد التوازي للوكلاء الفرعيين","subagentMaxDepth":"الحد الأقصى لعمق التعاقب","subagentModelSelectionAllowed":"الموديلات المتاحة لاختيار الوكلاء","subagentModelSelectionChoose":"عند التشغيل، يمكن للوكلاء اختيار مزوّد وموديل وجهد استدلال لكل وكيل فرعي من الموديلات المصرّح بها أدناه. ويسري ذلك على الجلسات الجديدة فقط.","subagentModelSelectionConflict":"تغيّرت الإعدادات في مكان آخر. تجاهل مسودتك وحاول مجددًا.","subagentModelSelectionEmpty":"لا يعلن أي مزوّد موديلات حاليًا عن موديل.","subagentModelSelectionLoadFailed":"تعذّر تحميل الموديلات.","subagentModelSelectionLoading":"جارٍ تحميل الموديلات…","subagentModelSelectionOff":"تستخدم الوكلاء الفرعية الافتراضيات المُعدّة أو ترث موديل الوكيل الأصلي. وتبقى اختيارات الموديل المحفوظة كما هي.","subagentModelSelectionPartial":"تعذّر تحميل بعض مزوّدي الموديلات؛ ويمكن مع ذلك إزالة الاختيارات المحفوظة.","subagentModelSelectionRequired":"اختر موديلًا واحدًا على الأقل قبل الحفظ.","subagentModelSelectionRetry":"إعادة المحاولة","subagentModelSelectionTitle":"اختيار الموديل","subagentModelSelectionToggle":"السماح للوكلاء باختيار موديلات للوكلاء الفرعيين","subagentModelSelectionUnavailable":"غير متاح حاليًا","subagentModelSelectionUnavailableGroup":"محفوظ لكنه غير متاح حاليًا","subagentTitle":"وكيل فرعي","unavailable":"لم يتم تحميل هذا البلاقن، لذا لا يمكن إعداده الآن."},"settings.theme":{"appearance.dark":"داكن","appearance.light":"فاتح","appearance.system":"النظام","appearance.title":"المظهر","fontFamily.code.description":"يُستخدم لكتل الكود والكود المضمَّن ومخرجات الأدوات. افصل بين الخطوط بفواصل، واتركه فارغًا للافتراضي","fontFamily.code.title":"خط الكود","fontFamily.placeholder":"افتراضي","fontFamily.terminal.description":"يُستخدم لطرفية الشريط الجانبي. افصل بين الخطوط بفواصل، واتركه فارغًا للافتراضي","fontFamily.terminal.title":"خط الطرفية","fontFamily.text.description":"يُستخدم لنص الواجهة والمحادثة. افصل بين الخطوط بفواصل، واتركه فارغًا للافتراضي","fontFamily.text.title":"خط النص","fontSize.code.decrease":"تصغير حجم خط الكود","fontSize.code.description":"يُستخدم لكتل الكود والكود المضمَّن ومخرجات الأدوات","fontSize.code.increase":"تكبير حجم خط الكود","fontSize.code.title":"حجم خط الكود","fontSize.more":"مزيد من إعدادات الخطوط","fontSize.terminal.decrease":"تصغير حجم خط الطرفية","fontSize.terminal.description":"يُستخدم لطرفية الشريط الجانبي","fontSize.terminal.increase":"تكبير حجم خط الطرفية","fontSize.terminal.title":"حجم خط الطرفية","fontSize.text.decrease":"تصغير حجم الخط","fontSize.text.description":"يؤثر في محتوى المحادثة فقط","fontSize.text.increase":"تكبير حجم الخط","fontSize.text.title":"حجم الخط","fontSize.unit":"px"},"settings.webSearch":{"apiKey":"مفتاح API","apiKeyHint":"يُخزَّن خارج ملف الإعدادات. اتركه فارغًا للاحتفاظ بالمفتاح الحالي.","apiKeySet":"هناك مفتاح مُعدّ.","apiKeyUnset":"لا يوجد مفتاح مُعدّ؛ ولا يمكن البحث إلا في المحادثات التي تستخدم موديلًا من حساب DeepSeek، عبر نقطة النهاية الافتراضية.","baseUrl":"نقطة النهاية","baseUrlHint":"اتركه فارغًا لاستخدام افتراضي المزوّد.","description":"أعدّ مزوّد بحث DeepSeek.","invalidNumber":"أدخل رقمًا، أو اتركه فارغًا لاستخدام القيمة الافتراضية.","maxUses":"الحد الأقصى للبحث لكل طلب","maxUsesHint":"عدد مرات البحث المسموح بها لطلب واحد قبل أن يجب أن يجيب.","overridden":"متجاوَز","readOnly":"يخزّن هذا النشر الإعدادات للقراءة فقط.","reset":"إعادة إلى الافتراضي","save":"حفظ","saveFailed":"لم يقبل النشر هذه القيم؛ تُركت لك لتصحيحها.","saving":"جارٍ الحفظ…","title":"البحث في الويب","unavailable":"لم يتم تحميل هذا البلاقن، لذا لا يمكن إعداده الآن."},"shortcuts":{"application":"التطبيق","approval":"منطقة الموافقة","cancel":"إلغاء","clear":"إزالة","clear-search":"مسح البحث","close":"إغلاق اختصارات لوحة المفاتيح","close-confirmation":"إغلاق التأكيد","conflict":"مستخدم بالفعل بواسطة «{commands}»","description":"اعرض الاختصارات وإجراءات الإدخال المتاحة وعدّلها","desktop-document":"userData/keybindings.json","desktop-reload":"أعد تشغيل Harness","dismiss":"إغلاق القائمة أو الحوار الأعلى","edit-label":"تعديل اختصار {command}","empty":"لا توجد اختصارات مطابقة","future":"أُنشئ إعداد الاختصارات في {location} بإصدار أحدث. ارتقِ بـ Harness ثم أعد المحاولة.","global-hint":"الفتح من أي مكان","input":"إدخال الرسالة","invalid":"إعداد الاختصارات في {location} تالف. انسخ هذا الإعداد احتياطيًا وأصلحه، ثم {reload}.","macos-web-help":"استخدم Command+/ أو Command+, أو Command+Backslash أو Control+Backquote أو Command+Option+مفتاح أو Command+Shift+مفتاح. وتُدعم أيضًا التركيبات التي تضم ثلاثة أو أربعة مفاتيح تعديل مختلفة. وقد لا تصل اختصارات المتصفح أو النظام إلى الصفحة.","menus":"القوائم والحوارات","modified-count":"{count} مخصّص","modifier-required":"أدرج Command أو Ctrl أو Alt في التركيبة.","move":"نقل تحديد القائمة","native-failed":"تعذّر تأمين تسجيل المفاتيح على سطح المكتب. اخرج من التسجيل وحاول مجددًا.","not-ready":"الاختصارات غير جاهزة. يرجى المحاولة مجددًا.","open":"فتح اختصارات لوحة المفاتيح","read":"تعذّرت قراءة {location}. تحقق من صلاحيات الوصول، ثم {reload}.","record":"اضغط اختصارًا","record-help":"أفلت المفاتيح للحفظ. وينقل Tab بين الإجراءات؛ ويلغي Esc.","reserved":"هذه التركيبة محجوزة لإجراءات النظام أو تحرير النص.","reset":"استعادة الافتراضي","reset-all":"استعادة كل الافتراضيات","reset-description":"استعد الاختصارات الافتراضية لهذه المنصة. وستُستعاد كل الاختصارات المعدّلة أو المحذوفة. ولا تتأثر المنصات الأخرى.","reset-failed":"تعذّرت استعادة الافتراضيات. لم تتغير اختصاراتك. يرجى إعادة المحاولة.","reset-saved":"تمت استعادة الاختصارات الافتراضية","reset-title":"استعادة كل الاختصارات الافتراضية؟","retry-save":"إعادة محاولة الحفظ","review":"راجعت أحدث إعداد","saved":"معدّل","search":"بحث في الاختصارات","select":"تحديد عنصر القائمة","settings":"اختصارات لوحة المفاتيح","stale":"تغيّر إعداد الاختصارات أو الأوامر المتاحة. راجع أحدث الارتباطات قبل الحفظ.","title":"اختصارات لوحة المفاتيح","too-many-keys":"لا تضغط أكثر من مفتاحين غير معدّلين. أفلت المفاتيح لتحاول مجددًا.","unbound":"بدون اختصار","unsupported-browser":"لا يدعم هذا المتصفح هذه التركيبة بعد.","unsupported-key":"هذا المفتاح غير مدعوم.","using-accepted":"تظل آخر ارتباطات قُرئت بنجاح سارية.","using-defaults":"الارتباطات الافتراضية سارية.","view":"تعديل الاختصارات","web-document":"مدخل localStorage في هذا الموقع dsh.keybindings.v1","web-help":"تركيبات المتصفح: Mod+/ أو Mod+Shift+, أو Mod+Shift+.. ويكون Mod هو Command على Mac وCtrl في غيره.","web-reload":"أعد تحميل الصفحة","windows-web-help":"استخدم Ctrl+/ أو Ctrl+, أو Ctrl+Alt+مفتاح أو Ctrl+Shift+مفتاح. وتُدعم أيضًا التركيبات التي تضم ثلاثة أو أربعة مفاتيح تعديل مختلفة. وقد لا تصل اختصارات المتصفح أو النظام إلى الصفحة.","write-failed":"تعذّر الحفظ. تم الاحتفاظ باختصاراتك السابقة ومسودتك الحالية. يرجى إعادة المحاولة."},"shortcuts.layout":{"toggle":"تبديل الشريط الجانبي الأيسر"},"sidebar":{"panels.label":"اللوحات العامة","session.new":"جلسة جديدة","session.new.label":"جلسة جديدة","toggle.collapse":"طيّ الشريط الجانبي","toggle.open":"فتح الشريط الجانبي"},"sidebarBrowser":{"address.changed":"تغيّر عنوان URL","address.placeholder":"أدخل عنوان HTTP(S)","address.unknown":"انتقلت الصفحة؛ ولا يمكن لهذا الحامل قراءة عنوان URL الجديد.","back":"رجوع","error.application-origin":"لا يمكن للمتصفح المضمّن فتح تطبيق DSH نفسه.","error.credentials":"لا يمكن أن تحتوي العناوين على اسم مستخدم أو كلمة مرور.","error.empty":"أدخل عنوانًا.","error.invalid":"هذا العنوان غير صالح أو طويل جدًا.","error.protocol":"تُدعم عناوين HTTP وHTTPS فقط؛ استخدم معاينة المستندات للملفات المحلية.","external":"فتح في متصفح النظام","forward":"للأمام","go":"انتقال","guide.description":"تصفّح صفحات الويب","guide.title":"المتصفح","load.failed":"تعذّر تحميل الصفحة؛ أعد تحميلها أو افتحها في متصفح النظام.","load.failed.detail":"فشل تحميل الصفحة ({code}): {description}","loading":"جارٍ الفتح…","reload":"إعادة التحميل","restore.action":"استعادة الصفحة","restore.previous":"مفتوحة سابقًا","sandbox.disable":"إيقاف قيود البيئة المعزولة","sandbox.enable":"استعادة قيود البيئة المعزولة","sandbox.warning":"قيود البيئة المعزولة معطّلة؛ ويمكن للصفحة التنقل في التطبيق الأعلى واستخدام التنزيلات والحوارات المنبثقة وأقفال الإدخال.","shortcut.noSession":"افتح جلسة أولًا","start":"أدخل عنوان HTTP(S) لبدء التصفح","type.label":"المتصفح"},"sidebarCodePreview":{"autoRefresh":"تحديث تلقائي","autoRefresh.disable":"إيقاف التحديث التلقائي","autoRefresh.enable":"تشغيل التحديث التلقائي","busy":"معاينة Office مشغولة. أعد المحاولة بعد قليل.","changed":"تغيّر الملف أثناء قراءته. أعد فتح المعاينة.","charts":"مخططات","closeDetails":"إغلاق تفاصيل الخط","code.copied":"تم النسخ","code.copy":"نسخ","conditionalFormatting":"تنسيق شرطي","copied":"تم النسخ","copy":"نسخ","encoding":"تعذّرت قراءة ترميز النص هذا. احفظ الملف بترميز UTF-8 أو UTF-16 مع BOM ثم أعد المحاولة.","error.notFound":"لم يُعثر على الملف. ربما نُقل أو حُذف.","error.notRegularFile":"ليس ملفًا عاديًا، لا يوجد ما يُعرض.","error.notText":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","error.tooLarge":"تتجاوز هذه الصفحة حد {limit} ولا يمكن قراءتها.","error.unavailable":"فشلت القراءة: {message}","failed":"تعذّر عرض PDF: {message}","featureSeparator":", ","footnotes":"الحواشي","formulaWarning":"يحتوي هذا المصنف على صيغ. وقد تكون النتائج المعروضة ناقصة أو غير دقيقة.","frame":"معاينة مستند HTML","images":"صور","invalid":"لا يمكن معاينة ملف Office هذا. قد يكون تالفًا أو محميًا بكلمة مرور أو بامتداد خاطئ.","language":"en","loadMore":"تحميل المزيد","loading":"جارٍ عرض المستند...","missingFontsCount":"الخطوط: {count}","missingFontsDescription":"هذه الخطوط غير متاحة لهذه المعاينة. وقد يختلف النص والتخطيط عن المستند الأصلي.","missingFontsTitle":"خطوط مفقودة","openWith":"فتح باستخدام","pageImage":"صفحة PDF {page}","password":"يتطلب ملف PDF هذا كلمة مرور؛ لا تُدعم المعاينات المحمية بكلمة مرور.","preview":"معاينة الصورة: {name}","reload":"إعادة قراءة الملف","reloadNow":"إعادة التحميل","rendererUnavailable":"معاينة {name} غير متاحة.","rendering":"جارٍ عرض الصفحة…","resourceUnavailable":"خدمة موارد الملفات غير متاحة.","retry":"إعادة المحاولة","shapes":"أشكال","timeout":"انتهت مهلة تحويل Office. أعد المحاولة.","title":"PDF","tooLarge":"يتجاوز ملف Office أو ملف PDF المحوّل حد حجم المعاينة. قلّل حجم الملف أو عدّل إعداد المعاينة.","unavailable":"معاينات Office غير متاحة. شغّل خدمة معاينة المستندات على الحاسوب الذي يعمل عليه DeepSeek Harness.","unsupported":"تتطلب معاينة PDF محتوى الملف كاملًا.","unsupportedFile":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","unsupportedNotice":"لا تدعم هذه المعاينة {features} في هذا المصنف. افتحه في تطبيق نظام للحصول على التجربة الكاملة.","viewMissingFonts":"خطوط مفقودة: {count}. انقر للعرض.","viewer.label":"Markdown","viewer.text":"نص عادي","workerFailed":"تعذّر متابعة عملية عرض PDF. يرجى إعادة المحاولة.","wrap.aria":"التفاف الأسطر","wrap.disable":"إيقاف التفاف الأسطر","wrap.enable":"تشغيل التفاف الأسطر","zoomControls":"أدوات التكبير","zoomFitWidth":"ملاءمة العرض","zoomIn":"تكبير","zoomMenu":"اختيار نسبة التكبير","zoomOut":"تصغير","zoomValue":"{percent}%"},"sidebarDocumentPreview":{"autoRefresh":"تحديث تلقائي","autoRefresh.disable":"إيقاف التحديث التلقائي","autoRefresh.enable":"تشغيل التحديث التلقائي","busy":"معاينة Office مشغولة. أعد المحاولة بعد قليل.","changed":"تغيّر الملف أثناء قراءته. أعد فتح المعاينة.","charts":"مخططات","closeDetails":"إغلاق تفاصيل الخط","code.copied":"تم النسخ","code.copy":"نسخ","conditionalFormatting":"تنسيق شرطي","copied":"تم النسخ","copy":"نسخ","encoding":"تعذّرت قراءة ترميز النص هذا. احفظ الملف بترميز UTF-8 أو UTF-16 مع BOM ثم أعد المحاولة.","error.notFound":"لم يُعثر على الملف. ربما نُقل أو حُذف.","error.notRegularFile":"ليس ملفًا عاديًا، لا يوجد ما يُعرض.","error.notText":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","error.tooLarge":"تتجاوز هذه الصفحة حد {limit} ولا يمكن قراءتها.","error.unavailable":"فشلت القراءة: {message}","failed":"تعذّر عرض PDF: {message}","featureSeparator":", ","footnotes":"الحواشي","formulaWarning":"يحتوي هذا المصنف على صيغ. وقد تكون النتائج المعروضة ناقصة أو غير دقيقة.","frame":"معاينة مستند HTML","images":"صور","invalid":"لا يمكن معاينة ملف Office هذا. قد يكون تالفًا أو محميًا بكلمة مرور أو بامتداد خاطئ.","language":"en","loadMore":"تحميل المزيد","loading":"جارٍ عرض المستند...","missingFontsCount":"الخطوط: {count}","missingFontsDescription":"هذه الخطوط غير متاحة لهذه المعاينة. وقد يختلف النص والتخطيط عن المستند الأصلي.","missingFontsTitle":"خطوط مفقودة","openWith":"فتح باستخدام","pageImage":"صفحة PDF {page}","password":"يتطلب ملف PDF هذا كلمة مرور؛ لا تُدعم المعاينات المحمية بكلمة مرور.","preview":"معاينة الصورة: {name}","reload":"إعادة قراءة الملف","reloadNow":"إعادة التحميل","rendererUnavailable":"معاينة {name} غير متاحة.","rendering":"جارٍ عرض الصفحة…","resourceUnavailable":"خدمة موارد الملفات غير متاحة.","retry":"إعادة المحاولة","shapes":"أشكال","timeout":"انتهت مهلة تحويل Office. أعد المحاولة.","title":"PDF","tooLarge":"يتجاوز ملف Office أو ملف PDF المحوَّل حد حجم المعاينة. قلّل حجم الملف أو عدّل إعدادات المعاينة.","unavailable":"معاينات Office غير متاحة. شغّل خدمة معاينة المستندات على الجهاز الذي يعمل عليه DeepSeek Harness.","unsupported":"تتطلب معاينة PDF محتويات الملف كاملة.","unsupportedFile":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","unsupportedNotice":"لا تدعم هذه المعاينة {features} في هذا المصنف. افتحه في تطبيق من تطبيقات النظام للحصول على التجربة الكاملة.","viewMissingFonts":"خطوط مفقودة: {count}. انقر للعرض.","viewer.label":"Markdown","viewer.text":"نص عادي","workerFailed":"تعذّر متابعة عملية عرض PDF. يرجى إعادة المحاولة.","wrap.aria":"التفاف الأسطر","wrap.disable":"إيقاف التفاف الأسطر","wrap.enable":"تشغيل التفاف الأسطر","zoomControls":"أدوات التكبير","zoomFitWidth":"ملاءمة العرض","zoomIn":"تكبير","zoomMenu":"اختيار مستوى التكبير","zoomOut":"تصغير","zoomValue":"{percent}%"},"sidebarExcel":{"autoRefresh":"تحديث تلقائي","autoRefresh.disable":"إيقاف التحديث التلقائي","autoRefresh.enable":"تشغيل التحديث التلقائي","busy":"معاينة Office مشغولة. أعد المحاولة بعد قليل.","changed":"تغيّر الملف أثناء قراءته. أعد فتح المعاينة.","charts":"مخططات","closeDetails":"إغلاق تفاصيل الخطوط","code.copied":"تم النسخ","code.copy":"نسخ","conditionalFormatting":"تنسيق شرطي","copied":"تم النسخ","copy":"نسخ","encoding":"تعذّرت قراءة ترميز النص هذا. احفظ الملف بترميز UTF-8 أو UTF-16 مع BOM ثم أعد المحاولة.","error.notFound":"الملف غير موجود. ربما نُقل أو حُذف.","error.notRegularFile":"ليس ملفًا عاديًا، لا يوجد ما يُعرض.","error.notText":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","error.tooLarge":"تتجاوز هذه الصفحة حد {limit} ولا يمكن قراءتها.","error.unavailable":"فشلت القراءة: {message}","failed":"تعذّر عرض PDF: {message}","featureSeparator":", ","footnotes":"الحواشي","formulaWarning":"يحتوي هذا المصنف على صيغ. قد تكون النتائج المعروضة ناقصة أو غير دقيقة.","frame":"معاينة مستند HTML","images":"صور","invalid":"لا يمكن معاينة ملف Office هذا. قد يكون تالفًا أو محميًا بكلمة مرور أو بامتداد خاطئ.","language":"en","loadMore":"تحميل المزيد","loading":"جارٍ عرض المستند...","missingFontsCount":"الخطوط: {count}","missingFontsDescription":"هذه الخطوط غير متاحة لهذه المعاينة. قد يختلف النص والتخطيط عن المستند الأصلي.","missingFontsTitle":"خطوط مفقودة","openWith":"فتح باستخدام","pageImage":"صفحة PDF {page}","password":"يتطلب ملف PDF هذا كلمة مرور؛ لا تُدعم المعاينات المحمية بكلمة مرور.","preview":"معاينة الصورة: {name}","reload":"إعادة قراءة الملف","reloadNow":"إعادة التحميل","rendererUnavailable":"معاينة {name} غير متاحة.","rendering":"جارٍ عرض الصفحة…","resourceUnavailable":"خدمة موارد الملفات غير متاحة.","retry":"إعادة المحاولة","shapes":"أشكال","timeout":"انتهت مهلة تحويل Office. أعد المحاولة.","title":"PDF","tooLarge":"يتجاوز ملف Office أو ملف PDF المحوَّل حد حجم المعاينة. قلّل حجم الملف أو عدّل إعدادات المعاينة.","unavailable":"معاينات Office غير متاحة. شغّل خدمة معاينة المستندات على الجهاز الذي يعمل عليه DeepSeek Harness.","unsupported":"تتطلب معاينة PDF محتويات الملف كاملة.","unsupportedFile":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","unsupportedNotice":"لا تدعم هذه المعاينة {features} في هذا المصنف. افتحه في تطبيق من تطبيقات النظام للحصول على التجربة الكاملة.","viewMissingFonts":"خطوط مفقودة: {count}. انقر للعرض.","viewer.label":"Markdown","viewer.text":"نص عادي","workerFailed":"تعذّر متابعة عملية عرض PDF. يرجى إعادة المحاولة.","wrap.aria":"التفاف الأسطر","wrap.disable":"إيقاف التفاف الأسطر","wrap.enable":"تشغيل التفاف الأسطر","zoomControls":"أدوات التكبير","zoomFitWidth":"ملاءمة العرض","zoomIn":"تكبير","zoomMenu":"اختيار مستوى التكبير","zoomOut":"تصغير","zoomValue":"{percent}%"},"sidebarFiles":{"autoRefresh":"تحديث تلقائي","autoRefresh.disable":"إيقاف التحديث التلقائي","autoRefresh.enable":"تشغيل التحديث التلقائي","empty":"مجلد فارغ","entry.other":"ليس ملفًا ولا مجلدًا، لذا لا يمكن فتحه.","error.notDirectory":"هذا ليس مجلدًا.","error.notFound":"هذا المجلد لم يعد موجودًا. ربما نُقل أو حُذف.","error.outsideWorkspace":"هذا المجلد خارج مساحة العمل، لذا لن يقرأه الشريط الجانبي.","error.unavailable":"فشلت القراءة: {message}","guide.description":"تصفّح ملفات مساحة عمل هذه الجلسة","guide.title":"ملفات مساحة العمل","loading":"جارٍ القراءة…","noWorkspace":"لا تحتوي هذه الجلسة على مجلد مساحة عمل.","reload":"إعادة التحميل","shortcut.noSession":"اختر جلسة أولًا","truncated":"عدد العناصر كبير جدًا، ويُعرض بعضها فقط.","type.label":"الملفات"},"sidebarImage":{"autoRefresh":"تحديث تلقائي","autoRefresh.disable":"إيقاف التحديث التلقائي","autoRefresh.enable":"تشغيل التحديث التلقائي","busy":"معاينة Office مشغولة. أعد المحاولة بعد قليل.","changed":"تغيّر الملف أثناء قراءته. أعد فتح المعاينة.","charts":"مخططات","closeDetails":"إغلاق تفاصيل الخطوط","code.copied":"تم النسخ","code.copy":"نسخ","conditionalFormatting":"تنسيق شرطي","copied":"تم النسخ","copy":"نسخ","encoding":"تعذّرت قراءة ترميز النص هذا. احفظ الملف بترميز UTF-8 أو UTF-16 مع BOM ثم أعد المحاولة.","error.notFound":"الملف غير موجود. ربما نُقل أو حُذف.","error.notRegularFile":"ليس ملفًا عاديًا، لا يوجد ما يُعرض.","error.notText":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","error.tooLarge":"تتجاوز هذه الصفحة حد {limit} ولا يمكن قراءتها.","error.unavailable":"فشلت القراءة: {message}","failed":"تعذّر عرض PDF: {message}","featureSeparator":", ","footnotes":"الحواشي","formulaWarning":"يحتوي هذا المصنف على صيغ. قد تكون النتائج المعروضة ناقصة أو غير دقيقة.","frame":"معاينة مستند HTML","images":"صور","invalid":"لا يمكن معاينة ملف Office هذا. قد يكون تالفًا أو محميًا بكلمة مرور أو بامتداد خاطئ.","language":"en","loadMore":"تحميل المزيد","loading":"جارٍ عرض المستند...","missingFontsCount":"الخطوط: {count}","missingFontsDescription":"هذه الخطوط غير متاحة لهذه المعاينة. قد يختلف النص والتخطيط عن المستند الأصلي.","missingFontsTitle":"خطوط مفقودة","openWith":"فتح باستخدام","pageImage":"صفحة PDF {page}","password":"يتطلب ملف PDF هذا كلمة مرور؛ لا تُدعم المعاينات المحمية بكلمة مرور.","preview":"معاينة الصورة: {name}","reload":"إعادة قراءة الملف","reloadNow":"إعادة التحميل","rendererUnavailable":"معاينة {name} غير متاحة.","rendering":"جارٍ عرض الصفحة…","resourceUnavailable":"خدمة موارد الملفات غير متاحة.","retry":"إعادة المحاولة","shapes":"أشكال","timeout":"انتهت مهلة تحويل Office. أعد المحاولة.","title":"PDF","tooLarge":"يتجاوز ملف Office أو ملف PDF المحوَّل حد حجم المعاينة. قلّل حجم الملف أو عدّل إعدادات المعاينة.","unavailable":"معاينات Office غير متاحة. شغّل خدمة معاينة المستندات على الجهاز الذي يعمل عليه DeepSeek Harness.","unsupported":"تتطلب معاينة PDF محتويات الملف كاملة.","unsupportedFile":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","unsupportedNotice":"لا تدعم هذه المعاينة {features} في هذا المصنف. افتحه في تطبيق من تطبيقات النظام للحصول على التجربة الكاملة.","viewMissingFonts":"خطوط مفقودة: {count}. انقر للعرض.","viewer.label":"Markdown","viewer.text":"نص عادي","workerFailed":"تعذّر متابعة عملية عرض PDF. يرجى إعادة المحاولة.","wrap.aria":"التفاف الأسطر","wrap.disable":"إيقاف التفاف الأسطر","wrap.enable":"تشغيل التفاف الأسطر","zoomControls":"أدوات التكبير","zoomFitWidth":"ملاءمة العرض","zoomIn":"تكبير","zoomMenu":"اختيار مستوى التكبير","zoomOut":"تصغير","zoomValue":"{percent}%"},"sidebarOffice":{"autoRefresh":"تحديث تلقائي","autoRefresh.disable":"إيقاف التحديث التلقائي","autoRefresh.enable":"تشغيل التحديث التلقائي","busy":"معاينة Office مشغولة. أعد المحاولة بعد قليل.","changed":"تغيّر الملف أثناء قراءته. أعد فتح المعاينة.","charts":"مخططات","closeDetails":"إغلاق تفاصيل الخطوط","code.copied":"تم النسخ","code.copy":"نسخ","conditionalFormatting":"تنسيق شرطي","copied":"تم النسخ","copy":"نسخ","encoding":"تعذّرت قراءة ترميز النص هذا. احفظ الملف بترميز UTF-8 أو UTF-16 مع BOM ثم أعد المحاولة.","error.notFound":"الملف غير موجود. ربما نُقل أو حُذف.","error.notRegularFile":"ليس ملفًا عاديًا، لا يوجد ما يُعرض.","error.notText":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","error.tooLarge":"تتجاوز هذه الصفحة حد {limit} ولا يمكن قراءتها.","error.unavailable":"فشلت القراءة: {message}","failed":"تعذّر عرض PDF: {message}","featureSeparator":", ","footnotes":"الحواشي","formulaWarning":"يحتوي هذا المصنف على صيغ. قد تكون النتائج المعروضة ناقصة أو غير دقيقة.","frame":"معاينة مستند HTML","images":"صور","invalid":"لا يمكن معاينة ملف Office هذا. قد يكون تالفًا أو محميًا بكلمة مرور أو بامتداد خاطئ.","language":"en","loadMore":"تحميل المزيد","loading":"جارٍ عرض المستند...","missingFontsCount":"الخطوط: {count}","missingFontsDescription":"هذه الخطوط غير متاحة لهذه المعاينة. قد يختلف النص والتخطيط عن المستند الأصلي.","missingFontsTitle":"خطوط مفقودة","openWith":"فتح باستخدام","pageImage":"صفحة PDF {page}","password":"يتطلب ملف PDF هذا كلمة مرور؛ لا تُدعم المعاينات المحمية بكلمة مرور.","preview":"معاينة الصورة: {name}","reload":"إعادة قراءة الملف","reloadNow":"إعادة التحميل","rendererUnavailable":"معاينة {name} غير متاحة.","rendering":"جارٍ عرض الصفحة…","resourceUnavailable":"خدمة موارد الملفات غير متاحة.","retry":"إعادة المحاولة","shapes":"أشكال","timeout":"انتهت مهلة تحويل Office. أعد المحاولة.","title":"PDF","tooLarge":"يتجاوز ملف Office أو ملف PDF المحوَّل حد حجم المعاينة. قلّل حجم الملف أو عدّل إعدادات المعاينة.","unavailable":"معاينات Office غير متاحة. شغّل خدمة معاينة المستندات على الجهاز الذي يعمل عليه DeepSeek Harness.","unsupported":"تتطلب معاينة PDF محتويات الملف كاملة.","unsupportedFile":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","unsupportedNotice":"لا تدعم هذه المعاينة {features} في هذا المصنف. افتحه في تطبيق من تطبيقات النظام للحصول على التجربة الكاملة.","viewMissingFonts":"خطوط مفقودة: {count}. انقر للعرض.","viewer.label":"Markdown","viewer.text":"نص عادي","workerFailed":"تعذّر متابعة عملية عرض PDF. يرجى إعادة المحاولة.","wrap.aria":"التفاف الأسطر","wrap.disable":"إيقاف التفاف الأسطر","wrap.enable":"تشغيل التفاف الأسطر","zoomControls":"أدوات التكبير","zoomFitWidth":"ملاءمة العرض","zoomIn":"تكبير","zoomMenu":"اختيار مستوى التكبير","zoomOut":"تصغير","zoomValue":"{percent}%"},"sidebarPdf":{"autoRefresh":"تحديث تلقائي","autoRefresh.disable":"إيقاف التحديث التلقائي","autoRefresh.enable":"تشغيل التحديث التلقائي","busy":"معاينة Office مشغولة. أعد المحاولة بعد قليل.","changed":"تغيّر الملف أثناء قراءته. أعد فتح المعاينة.","charts":"مخططات","closeDetails":"إغلاق تفاصيل الخطوط","code.copied":"تم النسخ","code.copy":"نسخ","conditionalFormatting":"تنسيق شرطي","copied":"تم النسخ","copy":"نسخ","encoding":"تعذّرت قراءة ترميز النص هذا. احفظ الملف بترميز UTF-8 أو UTF-16 مع BOM ثم أعد المحاولة.","error.notFound":"الملف غير موجود. ربما نُقل أو حُذف.","error.notRegularFile":"ليس ملفًا عاديًا، لا يوجد ما يُعرض.","error.notText":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","error.tooLarge":"تتجاوز هذه الصفحة حد {limit} ولا يمكن قراءتها.","error.unavailable":"فشلت القراءة: {message}","failed":"تعذّر عرض PDF: {message}","featureSeparator":", ","footnotes":"الحواشي","formulaWarning":"يحتوي هذا المصنف على صيغ. قد تكون النتائج المعروضة ناقصة أو غير دقيقة.","frame":"معاينة مستند HTML","images":"صور","invalid":"لا يمكن معاينة ملف Office هذا. قد يكون تالفًا أو محميًا بكلمة مرور أو بامتداد خاطئ.","language":"en","loadMore":"تحميل المزيد","loading":"جارٍ عرض المستند...","missingFontsCount":"الخطوط: {count}","missingFontsDescription":"هذه الخطوط غير متاحة لهذه المعاينة. قد يختلف النص والتخطيط عن المستند الأصلي.","missingFontsTitle":"خطوط مفقودة","openWith":"فتح باستخدام","pageImage":"صفحة PDF {page}","password":"يتطلب ملف PDF هذا كلمة مرور؛ لا تُدعم المعاينات المحمية بكلمة مرور.","preview":"معاينة الصورة: {name}","reload":"إعادة قراءة الملف","reloadNow":"إعادة التحميل","rendererUnavailable":"معاينة {name} غير متاحة.","rendering":"جارٍ عرض الصفحة…","resourceUnavailable":"خدمة موارد الملفات غير متاحة.","retry":"إعادة المحاولة","shapes":"أشكال","timeout":"انتهت مهلة تحويل Office. أعد المحاولة.","title":"PDF","tooLarge":"يتجاوز ملف Office أو ملف PDF المحوَّل حد حجم المعاينة. قلّل حجم الملف أو عدّل إعدادات المعاينة.","unavailable":"معاينات Office غير متاحة. شغّل خدمة معاينة المستندات على الجهاز الذي يعمل عليه DeepSeek Harness.","unsupported":"تتطلب معاينة PDF محتويات الملف كاملة.","unsupportedFile":"المعاينة غير متاحة لهذا النوع من الملفات بعد.","unsupportedNotice":"لا تدعم هذه المعاينة {features} في هذا المصنف. افتحه في تطبيق من تطبيقات النظام للحصول على التجربة الكاملة.","viewMissingFonts":"خطوط مفقودة: {count}. انقر للعرض.","viewer.label":"Markdown","viewer.text":"نص عادي","workerFailed":"تعذّر متابعة عملية عرض PDF. يرجى إعادة المحاولة.","wrap.aria":"التفاف الأسطر","wrap.disable":"إيقاف التفاف الأسطر","wrap.enable":"تشغيل التفاف الأسطر","zoomControls":"أدوات التكبير","zoomFitWidth":"ملاءمة العرض","zoomIn":"تكبير","zoomMenu":"اختيار مستوى التكبير","zoomOut":"تصغير","zoomValue":"{percent}%"},"sidebarRight":{"chrome.collapse":"طيّ الشريط الجانبي","chrome.collapseAria":"طيّ الشريط الجانبي الأيمن","chrome.exitFullscreen":"الخروج من ملء الشاشة","chrome.expand":"فتح الشريط الجانبي","chrome.expandAria":"فتح الشريط الجانبي الأيمن","chrome.toFullscreen":"ملء الشاشة","command.budget":"الحد الأقصى لوحتان","command.close":"إغلاق الصفحة أو النافذة الحالية","command.collapsed":"وسّع الشريط الجانبي الأيمن أولًا","command.empty":"افتح صفحة أولًا","command.float":"هذا الإجراء غير متاح في لوحة عائمة","command.fullscreen":"تبديل ملء شاشة اللوحة","command.noFocus":"ركّز على إحدى لوحات الشريط الجانبي الأيمن أولًا","command.noRefresh":"لا يمكن تحديث هذه الصفحة","command.noSession":"اختر جلسة أولًا","command.refresh":"تحديث الصفحة الحالية","command.stale":"تغيّرت الصفحة؛ ركّز عليها مرة أخرى","command.toggle":"تبديل الشريط الجانبي الأيمن","command.width":"العرض غير كافٍ للتقسيم، وسّع الشريط الجانبي","dock.addTab":"علامة تبويب جديدة","dock.closeFloat":"إغلاق","dock.closeTab":"إغلاق","dock.dockFloat":"إعادة إلى الشريط الجانبي","dock.drop.bottom":"إضافة تقسيم سفلي","dock.drop.center":"نقل إلى هنا","dock.drop.left":"إضافة تقسيم يساري","dock.drop.right":"إضافة تقسيم يميني","dock.drop.top":"إضافة تقسيم علوي","dock.emptyPane":"لوحة فارغة","dock.splitPane":"تقسيم","dock.splitPaneDisabled":"الحد الأقصى لوحتان","dock.splitPaneNarrow":"العرض غير كافٍ للتقسيم، وسّع الشريط الجانبي","tab.guide.title":"البدء","tab.unavailable":"لا يوجد هنا ما يمكنه عرض هذا النوع من المحتوى بعد."},"sidebarTerminal":{"attachmentEnded":"انتهى اتصال الطرفية. أعد الاتصال للمتابعة.","cleanupFailed":"تعذّر إنهاء الطرفية «{title}»: {message}","closed":"تم إغلاق الطرفية.","connecting":"جارٍ الاتصال…","control":"تولّي التحكم","creating":"جارٍ البدء…","description":"تشغيل الأوامر في مساحة عمل الجلسة","disconnected":"تم قطع الاتصال.","exited":"انتهت العملية ({code})","failed":"خطأ في الطرفية: {message}","inputFull":"ذاكرة الإدخال ممتلئة. أعد الاتصال وحاول مرة أخرى.","invalidOutput":"تعذّر استلام شاشة الطرفية. أعد الاتصال لاستعادتها.","loading":"جارٍ قراءة بيئة الطرفية…","missingTerminal":"هذه الطرفية لم تعد موجودة. افتح طرفية جديدة.","new":"طرفية جديدة","readonly":"هذا العرض للقراءة فقط.","reconnect":"إعادة الاتصال","recoveryFailed":"فشل استرجاع الطرفية: {message}","rename":"اسم الطرفية","retry":"إعادة المحاولة","retryRecovery":"إعادة محاولة استرجاع الطرفية","shell":"اختيار shell","shellEmpty":"لا تتوفر أي shell","shellLoading":"جارٍ تحميل shell…","shortcut.noSession":"اختر جلسة أولًا","terminalLimit":"تم بلوغ الحد الأقصى للطرفيات. أغلق الطرفيات غير المستخدمة وحاول مرة أخرى. تُحتسب الطرفيات المنتهية أيضًا ضمن الحد.","title":"الطرفية","unavailable":"غير متاح"},"skill":{"menu.userOnly":"للمستخدم فقط","row.failed":"فشل تحميل المهارة","row.inspect":"فحص","row.instructions":"التعليمات","row.preparing":"جارٍ التحضير لتحميل مهارة","row.running":"جارٍ تحميل المهارة","row.stopped":"تم إيقاف تحميل المهارة","row.title":"المهارة"},"slash.menu":{"command":"الأوامر","crumbs.aria":"التنقل بين المجلدات","drill.aria":"تصفّح المجلد","drill.hint":"تصفّح المجلد","drill.key":"Tab","loading":"جارٍ التحميل…","skill":"المهارات","subagent":"الوكلاء الفرعيون","suggestions.aria":"اقتراحات التشغيل"},"subagent":{"activity.completed":"مكتمل","activity.inactive":"غير قيد التشغيل","activity.running":"قيد التشغيل","branch.collapse":"طيّ الفروع التابعة لـ{label}","branch.expand":"توسيع الفروع التابعة لـ{label}","catalog.migrationRequired":"يلزم الترحيل","count.running.one":"{count} وكيل فرعي قيد التشغيل","count.running.other":"{count} وكيل فرعي قيد التشغيل","count.total.one":"{count} وكيل فرعي","count.total.other":"{count} وكيل فرعي","duration.days":"{days}ي","duration.daysHours":"{days}ي {hours}س","duration.exactDays":"{days}ي {hours}س {minutes}د {seconds}ث","duration.exactTitle":"إجمالي المدة النشطة: {duration}","duration.hours":"{hours}س {minutes}د {seconds}ث","duration.minutes":"{minutes}د {seconds}ث","duration.months":"~{months}ش","duration.monthsDays":"~{months}ش {days}ي","duration.seconds":"{seconds}ث","duration.years":"~{years}سن","duration.yearsMonths":"~{years}سن {months}ش","load.error":"تعذّر تحميل الوكلاء الفرعيين","loading.label":"جارٍ تحميل الوكلاء الفرعيين…","mode.continuable":"قابل للمتابعة","mode.external":"مهمة خارجية","mode.oneShot":"لمرة واحدة","mode.unknown":"نمط غير معروف","open.sidebar":"فتح في الشريط الجانبي","open.sidebar.aria":"فتح {label} في الشريط الجانبي","readonly.body":"جلسة الأصل غير متصلة؛ أعد فتحها لمتابعة إرسال الرسائل.","readonly.oneShot.body":"المهام التي تُنفَّذ لمرة واحدة لا تقبل متابعات؛ راجع سجل التنفيذ الكامل هنا.","readonly.oneShot.title":"سجل وكيل فرعي لمرة واحدة","readonly.title":"هذا الوكيل الفرعي للقراءة فقط في الوقت الحالي","readonly.unknown.body":"اقرأ جلسة الابن لتحديد ما إذا كان يمكن متابعتها.","retry":"إعادة المحاولة","sidebar.chat":"الدردشة","switcher.aria":"تبديل الوكيل الفرعي: {title}","tokens.million":"{value}M","tokens.thousand":"{value}K","tokens.total":"{value} توكن","tree.aria":"جلسات الوكلاء الفرعيين"},"trajectory":{"attachment.imageName":"صورة {index}","attachment.list":"المرفقات","block.label":"كتلة #{index} {type}","block.openSummary":"فتح ملخص استدعاء أداة الكتلة #{index}","block.openSummaryTitle":"فتح ملخص استدعاء الأداة","code.copyOutput":"نسخ المخرجات","code.copySource":"نسخ الكود","code.originalJson":"JSON الأصلي","code.output":"المخرجات","code.running":"قيد التشغيل…","code.source":"الكود","column.input":"الإدخال","column.model":"الموديل","column.output":"المخرجات","column.think":"التفكير","column.time":"الوقت","column.tools":"الأدوات","details.assistantMessage":"رسالة المساعد","details.close":"إغلاق التفاصيل","details.compacted":"مضغوط","details.error":"خطأ","details.event":"تفاصيل الحدث","details.failure.auth":"مفتاح API غير صالح","details.hierarchy":"التسلسل الهرمي","details.lastAttemptError":"خطأ المحاولة الأخيرة","details.model":"الموديل","details.provider":"المزوّد","details.purpose":"الغرض","details.resize":"تفاصيل حدث تغيير الحجم","details.resizeTitle":"اسحب لتغيير الحجم. انقر نقرًا مزدوجًا لإعادة الضبط.","details.result":"النتيجة","details.retry":"إعادة المحاولة","details.retryDelay":"مهلة إعادة المحاولة","details.source":"المصدر","details.status":"الحالة","details.subtoolCalls":"استدعاءات الأدوات الفرعية","details.toolCall":"استدعاء أداة","details.toolCalls":"استدعاءات الأدوات","group.compaction":"ضغط {seq}","group.message":"رسالة","group.step":"خطوة {step}","history.clickToLoadEarlier":"انقر لتحميل السجل الأقدم","history.loadEarlier":"تحميل السجل الأقدم","history.loadingEarlier":"جارٍ تحميل السجل الأقدم…","history.loadingEarlierAria":"جارٍ تحميل السجل الأقدم…","history.loadingTrajectory":"جارٍ تحميل المسار…","kind.assistant":"المساعد","kind.compacted":"مضغوط","kind.context":"السياق","kind.message":"رسالة","kind.sub":"فرعي","kind.subtool":"أداة فرعية","kind.system":"النظام","kind.tool":"أداة","kind.user":"المستخدم","layout.compacted":"تم ضغط السياق","layout.compacting":"جارٍ ضغط السياق…","layout.compactionFailed":"فشل الضغط","layout.compactionInterrupted":"توقف الضغط قبل اكتماله.","layout.fileAttachments":"ملفات ×{count}","layout.imageCount":"صور ×{count}","layout.initialSystemPrompt":"موجّه النظام الأولي","layout.systemPromptAndToolsUpdated":"تم تحديث موجّه النظام والأدوات","layout.systemPromptUpdated":"تم تحديث موجّه النظام","layout.toolAdded":"تمت إضافة أداة: {name}","layout.toolCallOnly":"استدعاء أداة فقط","layout.toolRemoved":"تمت إزالة أداة: {name}","layout.toolUpdateNotice":"تم تحديث الأدوات","layout.toolsAdded":"المضاف: {names}","layout.toolsAddedCount":"{count} مضاف","layout.toolsChanged":"{added} مضاف، {removed} مزال","layout.toolsRemoved":"المزال: {names}","layout.toolsRemovedCount":"{count} مزال","layout.toolsUpdated":"تم تحديث الأدوات","options.json":"JSON خيارات الطلب","options.notRecorded":"لم تُسجَّل الخيارات","record.json":"JSON","record.namedParametersJson":"JSON معاملات {name}","record.noContent":"لا يوجد محتوى","record.noOutput":"لا توجد مخرجات","record.noPayload":"لم تُلتقط أي حمولة","record.noResult":"لم تُلتقط أي نتيجة","record.outputJson":"JSON النتيجة","record.parameters":"المعاملات","record.parametersJson":"JSON المعاملات","record.payloadJson":"JSON الحمولة","record.resultJson":"JSON النتيجة","record.schemaUnavailable":"المخطط غير متاح","record.systemPrompt":"موجّه النظام","record.systemPromptMissing":"لا يوجد موجّه نظام في هذا الطلب","record.thinking":"التفكير","record.toolCallOnly":"(استدعاء أداة فقط)","record.tools":"الأدوات","record.toolsMissing":"لا توجد أدوات في هذا الطلب","record.wrapLines":"التفاف الأسطر","request.collapsedAssistant":"المساعد","request.collapsedSummary":"ملخص {kind} مطوي، {summary}","request.collapsedTurn":"دورة","request.compaction":"ضغط · {section}","request.compactionPurpose":"ضغط","request.label":"الطلب #{request}","request.labelCompaction":"الطلب #{request} · ضغط","request.noContent":"لا يوجد محتوى","request.retryProgress":"{retry} من {maximum}","request.rowAria":"{request}{kind}، {content}","request.rowAriaCompaction":"الطلب {request}، ضغط","request.rowPrefix":"الطلب {request}، ","section.betweenTurns":"بين الدورات","source.goal":"الهدف","source.goalRound":"الهدف · الجولة {round}","source.messageJson":"JSON مصدر الرسالة","source.notRecorded":"لم يُسجَّل المصدر","source.plugin":"بلاقن","source.pluginNamed":"بلاقن · {plugin}","source.unknown":"غير معروف","source.user":"المستخدم","status.completed":"مكتمل","status.failed":"فشل","status.pending":"قيد الانتظار","summary.steps.one":"{count} خطوة","summary.steps.other":"{count} خطوة","summary.toolCalls.one":"{count} استدعاء أداة","summary.toolCalls.other":"{count} استدعاء أداة","tab.diff":"الفرق","tab.options":"الخيارات","tab.payload":"الحمولة","tab.preview":"معاينة","tab.raw":"خام","tab.rawOutput":"المخرجات الخام","tab.result":"النتيجة","tab.schema":"المخطط","tab.source":"المصدر","tab.summary":"الملخص","tab.systemPrompt":"موجّه النظام","tab.timing":"التوقيت","tab.tools":"الأدوات","tab.usage":"الاستخدام","timeline.aria":"الخط الزمني للمسار","timeline.noTimingData":"لا توجد بيانات توقيت","timeline.overviewAria":"نظرة عامة على الخط الزمني؛ اسحب أفقيًا لتركيز الأحداث","timeline.started":"بدأ {time}","timeline.total":"الإجمالي {duration}","timeline.ttftDecoding":"TTFT {ttft} · فك الترميز {decoding}","timing.duration":"المدة","timing.durationTooShort":"المدة قصيرة جدًا","timing.firstTokenUnavailable":"التوكن الأول غير متاح","timing.generation":"التوليد","timing.notAvailable":"غير متاح","timing.notRecorded":"لم يُسجَّل","timing.outputTokensUnavailable":"توكنات المخرجات غير متاحة","timing.request":"توقيت الطلب","timing.sessionTimestamps":"الطوابع الزمنية للجلسة","timing.sessionTimestampsRunning":"الطوابع الزمنية للجلسة (قيد التشغيل)","timing.showLocalTime":"عرض التوقيت المحلي","timing.showUnixTimestamp":"عرض طابع Unix الزمني","timing.source":"مصدر التوقيت","timing.started":"بدأ","timing.stepStartUnavailable":"بداية الخطوة غير متاحة","timing.throughput":"الإنتاجية","timing.totalDuration":"المدة الإجمالية","timing.ttft":"TTFT","timing.usageUnavailable":"بيانات الاستخدام غير متاحة","toolbar.actualTime":"الوقت الفعلي","toolbar.aria":"شريط أدوات المسار","toolbar.calls":"الاستدعاءات","toolbar.collapseCalls":"طيّ الاستدعاءات","toolbar.collapseTurns":"طيّ الدورات","toolbar.duration":"المدة","toolbar.expandCalls":"توسيع الاستدعاءات","toolbar.expandTurns":"توسيع الدورات","toolbar.search":"بحث في المسار","toolbar.searchPlaceholder":"بحث","toolbar.turns":"الدورات","toolbar.useActualDuration":"استخدام المدة الفعلية","toolbar.useEqualWidth":"استخدام عمليات بعرض متساوٍ","turn.label":"الدورة {turn}","unit.milliseconds":"{value} م.ث","unit.seconds":"{value} ث","unit.tokens":"{value} توكن","unit.tokensPerSecond":"{value} توكن/ث","usage.cacheCreated":"تم إنشاء ذاكرة التخزين المؤقت","usage.cached":"مخزّن مؤقتًا","usage.content":"المحتوى","usage.input":"الإدخال","usage.notReported":"لم يُبلَّغ عن الاستخدام","usage.other":"أخرى","usage.output":"المخرجات","usage.reasoning":"الاستدلال","usage.sessionCumulative":"إجمالي الجلسة","usage.thisRequest":"هذا الطلب","usage.tokens":"التوكنات","view.trajectory":"المسار"},"voice-input":{"auto":"كشف تلقائي","cancel":"إلغاء","cancelPrepare":"إلغاء التحضير","cancelled":"تم إلغاء الإدخال الصوتي.","cloud":"سيُرسل الصوت إلى الخدمة السحابية المحددة.","cloudReady":"التعرّف السحابي على الكلام جاهز.","conflict":"تغيّرت مسودتك. النص المنسوخ محفوظ ويمكن إدراجه عند موضع المؤشر الحالي.","deviceMissing":"الميكروفون غير متاح. اختر جهاز إدخال آخر.","deviceUnavailable":"غير متاح","dictate":"إملاء","discard":"تجاهل النص","download.certificate":"تعذّر تنزيل {resource}: فشل التحقق من الشهادة.","download.dns":"تعذّر تنزيل {resource}: تعذّر تحليل عنوان التنزيل.","download.http":"تعذّر تنزيل {resource}: أعادت خدمة التنزيل HTTP {status}.","download.integrity":"تنزيل {resource} غير مكتمل أو فشل التحقق منه.","download.network":"تعذّر تنزيل {resource}: فشل الاتصال بخدمة التنزيل.","download.storage":"تعذّر حفظ {resource}: مساحة القرص غير كافية أو لا توجد صلاحية كتابة.","download.timeout":"انتهت مهلة تنزيل {resource}.","download.unknown":"تعذّر تجهيز {resource}.","downloadAdvice.certificate":"تحقّق من ساعة النظام والشهادات الموثوقة وإعدادات الوسيط على الجهاز الذي يشغّل DSH، ثم أعد المحاولة.","downloadAdvice.dns":"تحقّق من إعدادات DNS والوسيط على الجهاز الذي يشغّل DSH. تأكّد من قدرته على تحليل نطاق مصدر التنزيل، ثم أعد المحاولة.","downloadAdvice.http":"تأكّد من توفر عنوان التنزيل ومن قدرة الوسيط على الوصول إلى خدمة التنزيل، أو أعد المحاولة لاحقًا.","downloadAdvice.integrity":"أعد محاولة التنزيل. تُحتفظ بالملفات الأخرى المكتملة والمتحقَّق منها.","downloadAdvice.network":"تحقّق من قدرة الجهاز الذي يشغّل DSH على الوصول إلى مصدر التنزيل وخدمات تنزيل الموديلات. اضبط وسيطًا على ذلك الجهاز إذا لزم الأمر، ثم أعد المحاولة.","downloadAdvice.storage":"تحقّق من مساحة القرص المتاحة وصلاحية الكتابة لمجلد الموديل على الجهاز الذي يشغّل DSH، ثم أعد المحاولة.","downloadAdvice.timeout":"تحقّق من اتصال الشبكة أو الوسيط على الجهاز الذي يشغّل DSH، ثم أعد المحاولة لاحقًا. تُحتفظ بالملفات المنزَّلة المتحقَّق منها.","downloadAdvice.unknown":"تحقّق من الشبكة ومساحة القرص وصلاحيات مجلد الموديل على الجهاز الذي يشغّل DSH، ثم أعد المحاولة.","downloadBytes":"التنزيل: {completed} / {total} MB، {percent}%","downloadCode":"رمز الخطأ: {code}","downloadProgress":"تقدّم التنزيل","downloadSource":"مصدر التنزيل: {source}","downloadUnknown":"تم تنزيل {completed} MB","elapsed":"في انتظار {seconds} ثانية","empty":"لم يتم التعرّف على أي كلام","en":"الإنجليزية","failed":"فشل التعرّف على الكلام: {message}","inputDevice":"جهاز الإدخال","inputLevel":"مستوى إدخال الميكروفون","insert":"إدراج النص","interrupted":"توقف التسجيل. حاول مرة أخرى.","ja":"اليابانية","ko":"الكورية","language":"لغة التعرّف","loading":"جارٍ تحميل خدمات التعرّف…","local":"يتم التعرّف على الصوت على الجهاز الذي يشغّل DSH. إذا لزم تنزيل الموديلات، فيجب أن يتمكن ذلك الجهاز من الوصول إلى المصدر المحدد وخدمات ملفاته. اضبط وسيطًا على ذلك الجهاز إذا لزم الأمر.","permission":"الوصول إلى الميكروفون معطّل. اسمح به من إعدادات المتصفح والنظام.","preparation.cancelled":"أُلغي التجهيز. تُحتفظ بالتنزيلات المكتملة.","preparation.cancelling":"جارٍ إلغاء التجهيز…","preparation.checking":"جارٍ التحقق من الموارد المحلية…","preparation.loading":"جارٍ تحميل {name}…","preparation.ready":"التعرّف المحلي على الكلام جاهز.","preparation.standby":"الموارد المحلية جاهزة. يوقظ التسجيل أداة التعرّف.","preparation.unprepared":"يؤدي الاستخدام الأول إلى تنزيل موديلات التعرّف المحلية.","preparation.waking":"جارٍ إيقاظ التعرّف المحلي على الكلام…","preparationFailed":"فشل التجهيز: {message}","preparationSteps":"خطوات التجهيز","prepare":"تنزيل وتجهيز","provider":"خدمة التعرّف","reconnecting":"جارٍ الاتصال بخدمة التعرّف على الكلام…","recording":"جارٍ التسجيل…","requesting":"اسمح بالوصول إلى الميكروفون للمتابعة…","retryPrepare":"إعادة محاولة التجهيز","retryRecording":"التسجيل مرة أخرى","setup.disk":"مساحة القرص","setup.diskValue":"خصّص نحو {gb} GB للموديلات وبيئة التشغيل وذاكرة التنزيل المؤقتة","setup.estimateNote":"هذه تقديرات؛ وقد تستغرق الشبكات البطيئة وقتًا أطول. يُعاد استخدام التنزيلات؛ وتحرّر الموديلات الخاملة الذاكرة افتراضيًا.","setup.local":"ستُنزَّل الموديلات المحلية إلى الجهاز الذي يشغّل DSH. لا حاجة إلى Python أو مترجم.","setup.memory":"الذاكرة","setup.memoryValue":"نحو {gb} GB مع تحميل الموديل؛ وقد يستخدم التعرّف أكثر من ذلك","setup.time":"الإعداد الأول","setup.timeValue":"خصّص نحو {min}–{max} دقيقة، حسب الشبكة والجهاز","setupPrompt.body":"إدخال الصوت مفعّل. يتطلب الاستخدام الأول تنزيل موديلات التعرّف المحلية وتجهيزها. افتح تفاصيل البلاقن لمراجعة تقديرات مساحة القرص والذاكرة والوقت قبل بدء الإعداد.","setupPrompt.details":"فتح إعدادات بلاقن الصوت","setupPrompt.later":"لاحقًا","setupPrompt.open":"الانتقال إلى الإعداد","setupPrompt.title":"أعدّ إدخال الصوت قبل التسجيل","setupPrompt.trigger":"فتح إعداد إدخال الصوت","setupPrompt.unavailableBody":"افتح تفاصيل بلاقن الصوت للتحقق من حالة التعرّف أو تقدّم التجهيز أو الأخطاء.","setupPrompt.unavailableTitle":"التعرّف على الكلام غير جاهز","short.downloading":"جارٍ التنزيل","short.failed":"فشل الإعداد","sourceAuto":"تلقائي (موصى به)","sourceAutoHelp":"تفضيل أول مصدر يستجيب، ومحاولة مصدر آخر إذا فشل التنزيل.","sourceChoice":"مصدر تنزيل الموديل","sourceHuggingFace":"Hugging Face","sourceManualHelp":"التنزيل من المصدر المحدد فقط. يُعاد استخدام الملفات المنزَّلة المتحقَّق منها.","sourceMirror":"HF-Mirror (مرآة الصين)","start":"بدء التسجيل","step.check":"التحقق من الموارد المحلية","step.load":"تحميل {name}","step.model":"تجهيز موديل التعرّف","step.vad":"تجهيز موديل كشف الصوت","step.verify":"التحقق من ملفات الموديل","stepStatus.cancelled":"ملغى","stepStatus.complete":"مكتمل","stepStatus.failed":"فشل","stepStatus.pending":"لم يبدأ","stepStatus.running":"قيد التنفيذ","stop":"إيقاف ونسخ النص","systemMicrophone":"افتراضي النظام","systemMicrophoneNamed":"افتراضي النظام ({name})","tooLarge":"يتجاوز التسجيل حد الخدمة. جرّب تسجيلًا أقصر.","transcribingShort":"جارٍ نسخ النص…","unavailable":"لا يمكن لهذا المتصفح تسجيل الصوت. استخدم متصفحًا يدعم الميكروفون.","unnamedMicrophone":"ميكروفون {number}","unnamedSelectedMicrophone":"ميكروفون","wakingShort":"جارٍ الإيقاظ…","yue":"الكانتونية","zh":"الصينية"},"workflowRun":{"member.empty":"اسم عضو فارغ","member.open":"فتح {name}","phase.empty":"اسم مرحلة فارغ","phase.unassigned":"بلا مرحلة","run.empty":"لم يبدأ أي عضو","run.members.one":"{count} عضو","run.members.other":"{count} أعضاء","run.title":"{name}","status.cancelled":"ملغى","status.completed":"مكتمل","status.failed":"فشل","status.interrupted":"متوقف","status.running":"قيد التشغيل","statusCount.cancelled":"ملغى {count}","statusCount.completed":"مكتمل {count}","statusCount.failed":"فشل {count}","statusCount.interrupted":"متوقف {count}","statusCount.running":"قيد التشغيل {count}"},"workspace":{"actions.archive":"أرشفة","actions.newSession":"جلسة جديدة","actions.newSession.aria":"جلسة جديدة في {name}","actions.pin":"تثبيت","actions.session.aria":"إجراءات الجلسة لـ {name}","actions.unarchive":"إلغاء الأرشفة","actions.unpin":"إلغاء التثبيت","actions.workspace.aria":"إجراءات مساحة العمل لـ {name}","archive.confirm.action":"إيقاف وأرشفة","archive.confirm.activity":"العمل الذي سيُوقف","archive.confirm.desc":"لا يزال لدى “{title}” عمل قيد التنفيذ. تؤدي الأرشفة إلى إيقافه أولًا؛ ويمكنك استعادة الجلسة لاحقًا من تصفية “كل المحادثات (إظهار المؤرشفة)” في الشريط الجانبي، ولن يُستأنف العمل المُوقف من تلقاء نفسه.","archive.confirm.jobs.one":"{n} مهمة خلفية: {names}","archive.confirm.jobs.other":"{n} مهام خلفية: {names}","archive.confirm.listSeparator":"، ","archive.confirm.other.one":"{n} عنصر عمل آخر ({kind})","archive.confirm.other.other":"{n} عناصر عمل أخرى ({kind})","archive.confirm.pending":"جارٍ الإيقاف والأرشفة…","archive.confirm.schedules.one":"{n} تذكير مجدول: {names}","archive.confirm.schedules.other":"{n} تذكيرات مجدولة: {names}","archive.confirm.subagents.one":"{n} وكيل فرعي قيد التشغيل: {names}","archive.confirm.subagents.other":"{n} وكلاء فرعيون قيد التشغيل: {names}","archive.confirm.title":"إيقاف هذه الجلسة وأرشفتها؟","archive.confirm.turn":"الدورة الجارية","conflict.named":"توجد بالفعل مساحة عمل باسم “{name}”.","date.ymd":"{y}-{m}-{d}","defaultWorkspace.failed":"تعذّر إنشاء مساحة العمل الافتراضية. استخدم “اختيار مساحة عمل” لتحديد مجلد.","delete.desc":"يؤدي هذا إلى إزالة “{name}” من قائمة مساحات العمل. سيُحتفظ بالمجلد وسجلات الجلسات. وستظهر جلساتها ضمن “غير مجمّعة”.","delete.pending":"جارٍ حذف مساحة العمل…","delete.workspace":"حذف مساحة العمل","draft.initializationFailed":"تعذّر تعبئة المسودة. حاول مرة أخرى بعد قليل.","draft.workspaceRequired":"اختر مساحة عمل أولًا.","empty.noMatches":"لا توجد نتائج مطابقة","empty.none":"لا توجد جلسات بعد","empty.noneArchived":"لا توجد جلسات مؤرشفة بعد","empty.viewOthers":"عرض الجلسات الأخرى","field.sessionName":"اسم الجلسة","field.workspaceName":"اسم مساحة العمل","filterBy.label":"تصفية الجلسات","folderError.retry":"اختيار مرة أخرى","folderError.title":"تعذّر فتح المجلد","group.ungrouped":"غير مجمّعة","groupBy.flat":"في قائمة واحدة","groupBy.label":"التجميع حسب","groupBy.workspace":"مساحة العمل","groupBy.workspaceTree":"شجرة مساحات العمل","hover.copied":"تم النسخ","hover.created":"أُنشئت {time}","menu.addWorkspace":"إضافة مساحة عمل…","menu.archiveSession":"أرشفة الجلسة","menu.fork":"تفريع الجلسة","menu.pinSession":"تثبيت الجلسة","menu.unarchiveSession":"إلغاء أرشفة الجلسة","menu.unpinSession":"إلغاء تثبيت الجلسة","orderBy.label":"الترتيب حسب","orderBy.manual":"يدوي","orderBy.updated":"آخر تحديث","picker.loading":"جارٍ تحميل مساحات العمل…","rename":"إعادة التسمية","rename.session.title":"إعادة تسمية الجلسة","rename.workspace.title":"إعادة تسمية مساحة العمل","row.archived":"مؤرشفة","row.pinned":"مثبّتة","search.clear":"مسح البحث","search.hasMore":"عرض أول {n} نتيجة. ضيّق نطاق البحث.","search.noMatches":"لا توجد جلسات مطابقة","search.pending":"جارٍ البحث في سجل الجلسات…","search.placeholder":"بحث في أسماء الجلسات","search.results.aria":"نتائج البحث","search.sessions.aria":"بحث في الجلسات","section.sessions":"الجلسات","section.workspaces":"مساحات العمل","session.new":"جلسة جديدة","session.untitled":"بلا عنوان","sessions.collapse":"عرض أقل","sessions.count.one":"{n} جلسة","sessions.count.other":"{n} جلسات","sessions.expand":"عرض {n} جلسة إضافية","shortcut.directoryBusy":"جارٍ تحديد مساحة عمل أو إضافتها","shortcut.forkFailed":"تعذّر تفريع الجلسة. حاول مرة أخرى.","shortcut.noCompletedTurn":"لا تحتوي هذه الجلسة على دورة مكتملة","shortcut.noPicker":"منتقي المجلدات غير متاح","shortcut.noSession":"اختر جلسة أولًا","status.compact.answer":"الإجابة","status.compact.approval":"الموافقة","status.compact.planReview":"مراجعة الخطة","status.completed":"مكتمل","status.idle":"خامل","status.planReview":"خطة بانتظار المراجعة","status.running":"قيد التشغيل","status.subagentsRunning.one":"{n} وكيل فرعي قيد التشغيل","status.subagentsRunning.other":"{n} وكلاء فرعيون قيد التشغيل","status.waitingAnswer":"بانتظار الإجابة","status.waitingApproval":"بانتظار الموافقة","time.ago":"قبل {t}","time.days":"{n} يوم","time.hours":"{n} ساعة","time.minutes":"{n} دقيقة","time.months":"{n} شهر","time.now":"الآن","time.years":"{n} سنة","toast.archived":"تمت أرشفة الجلسة. يمكنك ","toast.archivedFilter":"تصفية الجلسات المؤرشفة","toast.archivedNotOpenable":"لا يمكن فتح الجلسات المؤرشفة. ألغِ أرشفتها للعرض.","toast.archivedOr":" أو ","toast.archivedUndo":"تراجع","toast.createFailed":"فشل إنشاء جلسة جديدة: {message}","toast.forkRequiresOpen":"افتح الجلسة الأصلية لإكمال الترحيل قبل إنشاء فرع.","toast.openForkSource":"فتح الجلسة الأصلية","toast.pinFailed":"فشل التثبيت. حاول مرة أخرى لاحقًا.","toast.stoppedAndArchived":"تم إيقاف الجلسة وأرشفتها. يمكنك ","toast.unpinFailed":"فشل إلغاء التثبيت. حاول مرة أخرى لاحقًا.","viewOptions.hideArchived":"إخفاء المؤرشفة","viewOptions.label":"خيارات العرض","viewOptions.onlyArchived":"المؤرشفة فقط","viewOptions.showArchived":"كل المحادثات (إظهار المؤرشفة)","workspace.add":"إضافة مساحة عمل"}}
    const PANEL_ID = 'environment-sidebar'
    const border = '1px solid rgba(128,128,128,.27)'
    const cardStyle = {
      border, borderRadius: 14, background: 'rgba(128,128,128,.065)',
      padding: 18, marginBottom: 14,
    }
    const labelStyle = { fontSize: 12, opacity: .72, marginBottom: 6 }
    const valueStyle = {
      fontSize: 14, fontWeight: 600, direction: 'auto', overflowWrap: 'anywhere',
    }

    function Field(label, value) {
      return h('div', { style: { padding: '8px 0' }, key: label },
        h('div', { style: labelStyle }, label),
        h('div', { style: valueStyle }, value === null || value === undefined || value === ''
          ? 'غير متاح' : String(value)))
    }

    function Section(title, children, hint) {
      return h('section', { style: cardStyle, 'aria-label': title },
        h('h2', { style: { fontSize: 17, fontWeight: 650, margin: '0 0 8px' } }, title),
        hint ? h('p', { style: { margin: '0 0 10px', opacity: .7, fontSize: 12, lineHeight: 1.8 } }, hint) : null,
        children)
    }

    function Icon({ size = 18, active = false }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
        strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
        style: { opacity: active ? 1 : .85, display: 'block' } },
        h('rect', { x: 3, y: 3, width: 18, height: 18, rx: 4 }),
        h('path', { d: 'M8 8h8M8 12h5M8 16h8' }),
        h('circle', { cx: 17.5, cy: 12, r: 1.3, fill: 'currentColor', stroke: 'none' }))
    }

    function formatDate(stamp) {
      if (typeof stamp !== 'number' || !Number.isFinite(stamp)) return 'غير متاح'
      const date = new Date(stamp)
      if (Number.isNaN(date.getTime())) return 'غير متاح'
      return date.toLocaleString('ar-SA')
    }

    function EnvironmentPanel({ sessions, workspaces, viewVersion }) {
      const [tab, setTab] = React.useState('environment')
      React.useEffect(() => {
        const rerender = () => setRefresh(value => value + 1)
        window.addEventListener('online', rerender)
        window.addEventListener('offline', rerender)
        return () => {
          window.removeEventListener('online', rerender)
          window.removeEventListener('offline', rerender)
        }
      }, [])
      // A refresh changes only local presentation; it does not request privileged Host data.
      const [refresh, setRefresh] = React.useState(0)
      const _refreshVersion = viewVersion + refresh
      void _refreshVersion

      const browser = typeof navigator === 'undefined' ? {} : navigator
      const browserPlatform = browser.userAgentData && browser.userAgentData.platform
        ? browser.userAgentData.platform : browser.platform
      const origin = typeof window !== 'undefined' && window.location ? window.location.origin : undefined
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const sessionIds = sessions && Array.isArray(sessions.ids) ? sessions.ids : []
      const byId = sessions && sessions.byId ? sessions.byId : {}
      const activeCount = sessionIds.reduce((total, id) => total + (byId[id] && byId[id].running ? 1 : 0), 0)
      const workspaceItems = workspaces && Array.isArray(workspaces.items) ? workspaces.items : []
      const archiveIds = workspaces && Array.isArray(workspaces.archivedSessionIds) ? workspaces.archivedSessionIds : []
      const pinnedIds = workspaces && Array.isArray(workspaces.pinnedSessionIds) ? workspaces.pinnedSessionIds : []
      const recent = sessionIds.map(id => byId[id]).filter(Boolean)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 5)

      const tabs = [
        { id: 'environment', title: 'بيئة التشغيل' },
        { id: 'context', title: 'السياق' },
        { id: 'outputs', title: 'المخرجات' },
      ]
      let body
      if (tab === 'environment') {
        body = Section('بيئة التشغيل', h('div', null,
          Field('المنصة (كما يعرضها المتصفح)', browserPlatform),
          Field('لغة المتصفح', browser.language),
          Field('المنطقة الزمنية', timezone),
          Field('عنوان واجهة التطبيق (Origin فقط)', origin),
          Field('اتصال المتصفح', browser.onLine === undefined ? 'غير متاح' : browser.onLine ? 'متصل' : 'غير متصل')),
        'هذه بيانات المتصفح والواجهة، وليست متغيرات بيئة Windows أو العمليات المحلية.')
      } else if (tab === 'context') {
        body = Section('سياق العمل', h('div', null,
          Field('عدد مساحات العمل', workspaceItems.length),
          Field('عدد الجلسات المسجلة', sessionIds.length),
          Field('جلسات قيد التشغيل', activeCount),
          Field('جلسات مؤرشفة', archiveIds.length),
          Field('جلسات مثبتة', pinnedIds.length),
          Field('حالة مزامنة الجلسات', sessions && sessions.phase === 'ready' ? 'جاهزة' : 'بانتظار المزامنة'),
          Field('حالة مزامنة المساحات', workspaces && workspaces.phase === 'ready' ? 'جاهزة' : 'بانتظار المزامنة')),
        'تُقرأ الأعداد من الفهارس الرسمية في Harness وتُحدَّث عند تغيّرها. لا تُعرض محتويات المحادثات.')
      } else {
        body = Section('المخرجات والنشاط', h('div', null,
          h('p', { style: { fontSize: 13, lineHeight: 1.8, margin: '4px 0 14px' } },
            'مخرجات الأدوات ونصوص ردود الوكيل غير متاحة عبر فهرس الجلسات المستخدم هنا. يعرض هذا القسم آخر نشاط موثق للجلسات فقط.'),
          h('h3', { style: { fontSize: 14, margin: '0 0 10px' } }, 'آخر نشاط للجلسات'),
          recent.length === 0
            ? h('p', { style: { opacity: .7, fontSize: 13 } }, 'لا توجد جلسات مسجلة.')
            : h('ol', { style: { paddingInlineStart: 24, margin: 0 } },
              recent.map(item => h('li', {
                key: item.id, style: { padding: '8px 0', borderBottom: border },
              },
              h('div', { style: { fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere' } },
                item.displayTitle || 'جلسة بدون عنوان'),
              h('div', { style: { fontSize: 12, opacity: .7, marginTop: 4 } },
                formatDate(item.updatedAt) + (item.running ? ' · قيد التشغيل' : ' · غير نشطة')))))),
        'هذا القسم للقراءة فقط ولا يرسل أي سجلات إلى خدمة خارجية.')
      }

      return h('main', {
        'data-environment-sidebar': '',
        dir: 'rtl',
        style: {
          height: '100%', boxSizing: 'border-box', overflow: 'auto',
          padding: '28px clamp(16px, 4vw, 44px)', color: 'inherit',
          fontFamily: 'inherit', lineHeight: 1.6,
        },
      },
      h('div', { style: { maxWidth: 850, margin: '0 auto' } },
        h('header', { style: { display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, marginBottom: 20, flexWrap: 'wrap' } },
          h('div', null,
            h('h1', { style: { margin: 0, fontSize: 25, fontWeight: 700 } }, 'بيئة وسياق'),
            h('div', { style: { fontSize: 12, opacity: .65, marginTop: 4 } },
              'Environment · Context · Outputs')),
          h('button', {
            type: 'button', onClick: () => setRefresh(value => value + 1),
            style: { background: 'transparent', color: 'inherit', border,
              borderRadius: 10, padding: '8px 12px', cursor: 'pointer' },
            'aria-label': 'تحديث العرض',
          }, 'تحديث العرض')),
        h('nav', { role: 'tablist', 'aria-label': 'أقسام الإضافة',
          style: { display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' } },
          tabs.map(item => h('button', {
            key: item.id, type: 'button', role: 'tab', id: 'env-tab-' + item.id,
            'aria-selected': tab === item.id, 'aria-controls': 'env-panel-' + item.id,
            onClick: () => setTab(item.id),
            style: { border, borderRadius: 10, cursor: 'pointer', padding: '9px 14px',
              background: tab === item.id ? 'rgba(70,130,180,.18)' : 'transparent',
              fontWeight: tab === item.id ? 700 : 400, color: 'inherit' },
          }, item.title))),
        h('div', { role: 'tabpanel', id: 'env-panel-' + tab,
          'aria-labelledby': 'env-tab-' + tab }, body),
        h('p', { style: { opacity: .6, fontSize: 12, lineHeight: 1.8 } },
          'إضافة مستقلة — لا تقرأ متغيرات البيئة السرية، ولا تنفذ أوامر، ولا تتصل بخوادم خارجية.')))
    }


    const TYPE = '@abinadwan/dsh-plugins-suite'
    const KIND = 'environment-dashboard'
    const muted = { fontSize: 11, opacity: 0.7, lineHeight: 1.6 }
    function line(label, value) {
      return h('div', { style: { display: 'flex', justifyContent: 'space-between',
        gap: 10, padding: '4px 0', fontSize: 12 } },
        h('span', null, label),
        h('span', { style: { opacity: .75, textAlign: 'right' } }, value == null ? '—' : String(value)))
    }
    function section(name, rows) {
      return h('details', { open: true, key: name, style: {
        padding: '12px 0', borderBottom: '1px solid rgba(127,127,127,.24)' } },
        h('summary', { style: { cursor: 'pointer', fontWeight: 650, marginBottom: 9,
          fontSize: 12 } }, name),
        h('div', null, ...rows))
    }
    const good = x => typeof x === 'number' && Number.isFinite(x) && x >= 0 ? x : undefined
    const compact = x => {
      const n = good(x)
      if (n === undefined) return '—'
      if (n < 1000) return String(Math.round(n))
      return n < 1000000 ? (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k'
        : (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
    }

    // Only stable published GitHub Releases may trigger an in-app update offer.
    // This browser-side checker never installs anything without a separate click.
    const INSTALLED_VERSION = '0.8.0-rc.1'
    const PACKAGE_NAME = '@abinadwan/dsh-plugins-suite'
    const RELEASE_SOURCE = 'https://api.github.com/repos/abinadwan/DSH-ABINADWAN-Plugins-Suite/releases/latest'
    const COMMIT_SOURCE = 'https://api.github.com/repos/abinadwan/DSH-ABINADWAN-Plugins-Suite/commits/'
    const RAW_MANIFEST = 'https://raw.githubusercontent.com/abinadwan/DSH-ABINADWAN-Plugins-Suite/'
    const PINNED_SPEC_PREFIX = 'github:abinadwan/DSH-ABINADWAN-Plugins-Suite#'
    // Host-normalised repository location (plugin-manager `pinnedGitOrigin`), lower-cased for the identity check.
    const REPOSITORY_LOCATION = 'github.com/abinadwan/dsh-abinadwan-plugins-suite'
    const PROJECT_URL = 'https://github.com/abinadwan/DSH-ABINADWAN-Plugins-Suite'
    const FULL_COMMIT = /^[0-9a-f]{40}$/
    const CHECK_INTERVAL = 24 * 60 * 60 * 1000
    let versionSnapshot = Object.freeze({phase:'idle'})
    const versionListeners = new Set()
    let nextAllowedCheck = 0
    let inflightCheck = null
    let versionDisposed = false
    let versionGeneration = 0
    function versionParts(version) {
      if (typeof version !== 'string') return null
      const found = /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[0-9A-Za-z.-]+)?$/.exec(version)
      return found && [Number(found[1]), Number(found[2]), Number(found[3])].every(Number.isSafeInteger)
        ? { numbers: [Number(found[1]), Number(found[2]), Number(found[3])], pre: found[4] || '' } : null
    }
    function isNewerVersion(remote, installed) {
      const a = versionParts(remote), b = versionParts(installed)
      if (!a || !b) return null
      for (let i = 0; i < 3; i++) {
        if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] > b.numbers[i]
      }
      if (!a.pre && b.pre) return true
      if (a.pre && !b.pre) return false
      if (a.pre && b.pre) {
        const aa = a.pre.split('.'), bb = b.pre.split('.')
        for (let i = 0; i < Math.max(aa.length, bb.length); i++) {
          if (aa[i] === undefined) return false
          if (bb[i] === undefined) return true
          if (aa[i] === bb[i]) continue
          const an = /^\d+$/.test(aa[i]), bn = /^\d+$/.test(bb[i])
          if (an && bn) return Number(aa[i]) > Number(bb[i])
          if (an !== bn) return !an
          return aa[i] > bb[i]
        }
      }
      return false
    }
    /**
     * Every generated Harness Remote method resolves to `RemoteResult<T>`:
     * `{ ok: true, value }` or `{ ok: false, error }`. Never treat the envelope
     * itself as the value.
     */
    function remoteValue(answer, label) {
      if (answer && answer.ok === true) return answer.value
      const error = answer && answer.ok === false ? answer.error : undefined
      const reason = error && (error.message || error.code)
      throw new Error(label + ' failed: ' + (reason ? String(reason) : 'invalid Host response'))
    }
    function publishVersion(next, expectedGeneration = versionGeneration) {
      if (versionDisposed || expectedGeneration !== versionGeneration) return
      versionSnapshot = Object.freeze(next)
      for (const notify of [...versionListeners]) notify()
    }
    function subscribeVersion(notify) {
      versionListeners.add(notify)
      return () => versionListeners.delete(notify)
    }
    const getVersionSnapshot = () => versionSnapshot
    function getReleaseVersion(payload) {
      if (!payload || payload.draft !== false || payload.prerelease !== false ||
        typeof payload.tag_name !== 'string' || !/^v\d+\.\d+\.\d+$/.test(payload.tag_name)) {
        throw new Error('Untrusted or unsupported release metadata')
      }
      return payload.tag_name.slice(1)
    }
    const offline = () => typeof navigator === 'object' && navigator !== null && navigator.onLine === false
    async function githubJSON(url) {
      if (offline()) throw new Error('This device appears to be offline')
      const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(10000) : undefined
      let response
      try {
        response = await fetch(url, {
          method:'GET', credentials:'omit', cache:'no-store', referrerPolicy:'no-referrer',
          headers:{Accept:'application/vnd.github+json'},
          ...signal ? {signal} : {},
        })
      } catch (error) {
        throw new Error('GitHub could not be reached (' + String(error?.message || error) + ')')
      }
      if (response.status === 404 && url === RELEASE_SOURCE) return null
      if (response.status === 403 || response.status === 429) {
        throw new Error('GitHub refused the request (HTTP ' + response.status + ', possibly rate limited). Try again later')
      }
      if (!response.ok) throw new Error('GitHub returned HTTP ' + response.status)
      try {
        return await response.json()
      } catch {
        throw new Error('GitHub returned an unreadable response')
      }
    }
    const stamp = () => new Date().toLocaleTimeString()
    function checkRelease(force = false) {
      if (versionDisposed) return Promise.resolve()
      if (inflightCheck) return inflightCheck
      const now = Date.now()
      if (!force && now < nextAllowedCheck) return Promise.resolve()
      nextAllowedCheck = now + CHECK_INTERVAL
      const generation = versionGeneration
      publishVersion({...versionSnapshot, phase:'checking'}, generation)
      const task = (async () => {
        try {
          const release = await githubJSON(RELEASE_SOURCE)
          if (!release) {
            publishVersion({phase:'unreleased', checked:stamp()}, generation)
            return
          }
          const latest = getReleaseVersion(release)
          if (isNewerVersion(latest, INSTALLED_VERSION) === null) throw new Error('Invalid release version')
          publishVersion({phase:'ready',latest,tag:release.tag_name,checked:stamp()}, generation)
        } catch (error) {
          publishVersion({phase:'error',message:String(error?.message || error),checked:stamp()}, generation)
        }
      })()
      const pending = task.finally(() => {if (inflightCheck === pending) inflightCheck = null})
      inflightCheck = pending
      return pending
    }
    /** The repository location of a Git spec, normalised as the Host's `pinnedGitOrigin` does. */
    function gitLocation(spec) {
      const hash = spec.indexOf('#')
      return (hash === -1 ? spec : spec.slice(0, hash))
        .replace(/^github:/i, 'github.com/').replace(/^git\+/i, '')
        .replace(/^[a-z][a-z0-9+.-]*:\/\//i, '').replace(/^[^@/]+@/, '').replace(/^([^/:]+):(?!\d)/, '$1/')
        .replace(/\/+$/, '').replace(/\.git$/i, '').toLowerCase()
    }
    /**
     * Classify how the Host installed this bundle, from its `listBundles()` row.
     * Only a Git spec pinned to a full commit of this repository's root can be
     * updated in place by the Host (`BundleInfo.update === 'git'`).
     */
    function installMode(bundle) {
      if (!bundle || bundle.installed !== true) return { kind:'missing' }
      const source = typeof bundle.source === 'string' ? bundle.source : ''
      if (bundle.update === 'registry') return { kind:'registry', source }
      if (source && gitLocation(source) !== REPOSITORY_LOCATION) return { kind:'foreign', source }
      if (bundle.update !== 'git') return { kind:'unpinned', source }
      const hash = source.indexOf('#')
      const params = hash === -1 ? [] : source.slice(hash + 1).split('&')
      const paths = params.filter(part => part.startsWith('path:'))
      const commits = params.filter(part => !part.startsWith('path:'))
      const path = paths.length ? paths[0].slice(5).replace(/^\/+|\/+$/g, '') : ''
      if (paths.length > 1 || path !== '' || commits.length !== 1 || !FULL_COMMIT.test(commits[0].toLowerCase())) {
        return { kind:'unpinned', source }
      }
      return { kind:'pinned', source, commit:commits[0].toLowerCase(), location:source.slice(0, hash) }
    }
    const useAccess = (hook, action) => typeof hook === 'function' ? hook(action) === true : false
    function useMounted() {
      const mounted = React.useRef(true)
      React.useEffect(() => {
        mounted.current = true
        return () => { mounted.current = false }
      }, [])
      return mounted
    }
    const MIGRATION_STEPS = [
      'Harness can update a Git-installed bundle in place only when it was installed from a spec pinned to a full 40-character commit. Nothing was changed.',
      'One-time migration (manual, at your discretion): note which components are switched on, Uninstall this bundle from this page, then use Add plugin with the pinned spec shown below, and switch the components back on.',
      'Personal Profile settings are stored in this Harness Profile\'s configuration and uninstalling may remove them. If you use Personal Profile, first export a JSON backup from Personal Profile → Backup & Restore (it includes your saved access permissions and is not encrypted). If the pinned install fails, reinstall from the same spec or from the original source.',
    ]
    // Installed-plugin detail page only; never run an installer in a React effect.
    function VersionUpdates({ installedVersion, pluginManager, useRemoteAccess }) {
      const update = React.useSyncExternalStore(subscribeVersion,getVersionSnapshot,getVersionSnapshot)
      const [action, setAction] = React.useState({phase:'idle'})
      const [mode, setMode] = React.useState({kind:'unknown'})
      const mounted = useMounted()
      const canList = useAccess(useRemoteAccess, 'pluginManager/listBundles')
      const canUpdate = useAccess(useRemoteAccess, 'pluginManager/updateBundle')
      const hostVersion = versionParts(installedVersion) ? installedVersion : undefined
      const currentVersion = hostVersion || INSTALLED_VERSION
      const newer = update.phase === 'ready' ? isNewerVersion(update.latest,currentVersion) : false
      const phase = update.phase === 'ready' ? (newer ? 'available' : 'current') : update.phase
      // A read-only Host lookup so the page states up front whether in-app
      // updates are possible for this installation. It never changes anything.
      React.useEffect(() => {
        if (!canList || !pluginManager) return undefined
        let live = true
        Promise.resolve().then(() => pluginManager.listBundles()).then(answer => {
          const bundles = remoteValue(answer, 'Plugin list')
          const bundle = Array.isArray(bundles) ? bundles.find(item => item?.name === PACKAGE_NAME) : undefined
          if (live) setMode(installMode(bundle))
        }).catch(error => { if (live) setMode({kind:'error',message:String(error?.message || error)}) })
        return () => { live = false }
      }, [canList, pluginManager, update.checked])
      async function prepare() {
        setAction({phase:'checking'})
        try {
          if (phase !== 'available' || typeof update.tag !== 'string') throw new Error('No approved newer release')
          // Resolve the release tag to an immutable commit, and verify the
          // package identity and exact version at that commit.
          const commit = await githubJSON(COMMIT_SOURCE + encodeURIComponent(update.tag))
          const sha = typeof commit?.sha === 'string' ? commit.sha.toLowerCase() : ''
          if (!FULL_COMMIT.test(sha)) throw new Error('Invalid release commit')
          const manifest = await githubJSON(RAW_MANIFEST + sha + '/package.json')
          if (manifest?.name !== PACKAGE_NAME || manifest?.version !== update.latest) {
            throw new Error('Release manifest does not match the expected package')
          }
          if (!canList || !pluginManager) throw new Error('Plugin management access is not available in this window')
          const bundles = remoteValue(await pluginManager.listBundles(), 'Plugin list')
          const bundle = Array.isArray(bundles) ? bundles.find(item => item?.name === PACKAGE_NAME) : undefined
          const current = installMode(bundle)
          if (mounted.current) setMode(current)
          if (current.kind === 'missing') throw new Error('This bundle is not listed as installed by the Host')
          if (current.kind === 'foreign') throw new Error('This bundle was installed from another repository; it will not be updated from here')
          if (current.kind === 'registry') throw new Error('This copy is managed from a registry; use the native Versions section')
          if (current.kind !== 'pinned') {
            if (mounted.current) setAction({phase:'manual',latest:update.latest,sha,spec:PINNED_SPEC_PREFIX + sha})
            return
          }
          if (bundle.version !== currentVersion) {
            throw new Error('Installed bundle version changed; reopen Plugins and check again')
          }
          if (current.commit === sha) throw new Error('The installed commit already matches this release')
          if (!canUpdate) throw new Error('This window may not update plugins; use the owner session')
          if (mounted.current) setAction({phase:'confirm',latest:update.latest,sha,spec:current.location + '#' + sha})
        } catch (error) {
          if (mounted.current) setAction({phase:'error',message:String(error?.message || error)})
        }
      }
      async function applyUpdate() {
        if (action.phase !== 'confirm' || !FULL_COMMIT.test(action.sha) ||
          typeof action.spec !== 'string' || !action.spec.endsWith('#' + action.sha) ||
          gitLocation(action.spec) !== REPOSITORY_LOCATION ||
          isNewerVersion(action.latest,currentVersion) !== true || !canUpdate) return
        const {latest,spec} = action
        setAction({phase:'installing',latest})
        try {
          // The Host owns package management, permissions, compatibility,
          // removal, reinstallation on failure and restart reporting.
          const result = remoteValue(await pluginManager.updateBundle(PACKAGE_NAME, latest, {spec}), 'Host update')
          const outcome = result?.result
          const state = outcome?.application
          if (result?.restore) {
            const restored = result.restore.application
            throw new Error('The new version did not install' +
              (outcome?.error?.code ? ' (' + outcome.error.code + ')' : '') + '; the Host ' +
              (restored === 'failed' || restored === 'cancelled'
                ? 'could not reinstall the previous version. Reinstall it from the Plugins page'
                : 'reinstalled the previous version'))
          }
          if (state === 'failed' || state === 'cancelled') {
            throw new Error('Host reported ' + state + (outcome?.error?.code ? ' (' + outcome.error.code + ')' : '') +
              ' at the ' + (result?.step || 'update') + ' step')
          }
          if (state !== 'applied' && state !== 'restart-required' && state !== 'overridden') {
            throw new Error('Update outcome not confirmed. Check the native Plugins page')
          }
          if (mounted.current) setAction({phase:'done',latest,restart:state === 'restart-required'})
        } catch (error) {
          if (mounted.current) setAction({phase:'error',message:String(error?.message || error)})
        }
      }
      const soft = 'rgba(127,127,127,.16)'
      const muted = {fontSize:12,opacity:.72,lineHeight:1.65,margin:0}
      const status = phase === 'checking' ? 'Checking GitHub Releases…'
        : phase === 'available' ? 'Update available: v' + update.latest
        : phase === 'current' ? 'Up to date'
        : phase === 'unreleased' ? 'No published stable release yet'
        : phase === 'error' ? 'Could not check for updates'
        : 'Not checked yet'
      const method = mode.kind === 'pinned' ? 'Git, pinned to ' + mode.commit.slice(0, 12)
        : mode.kind === 'unpinned' ? 'Git, not pinned to a commit (in-app update unavailable)'
        : mode.kind === 'registry' ? 'Registry'
        : mode.kind === 'foreign' ? 'Another repository'
        : mode.kind === 'missing' ? 'Not listed by the Host'
        : mode.kind === 'error' ? 'Unavailable (' + mode.message + ')'
        : 'Checking…'
      const buttonStyle = {border:'1px solid rgba(127,127,127,.35)',borderRadius:8,
        padding:'8px 12px',fontSize:12,color:'inherit',background:'transparent',cursor:'pointer'}
      const busy = action.phase === 'checking' || action.phase === 'installing'
      return h('section',{'data-environment-update-section':'','aria-label':'Suite updates',
        style:{borderTop:'1px solid ' + soft,padding:'20px 0',color:'inherit'}},
        h('header',{style:{display:'flex',alignItems:'center',gap:12,
          justifyContent:'space-between',marginBottom:14}},
          h('h3',{style:{fontSize:16,margin:0,fontWeight:650}},'Suite updates (GitHub Releases)'),
          h('button',{type:'button','data-check-updates':'',
            'aria-label':'Check for plugin updates',disabled:phase==='checking' || busy,
            onClick:()=>{void checkRelease(true)},style:buttonStyle},'↻ Check again')),
        h('div',{style:{border:'1px solid rgba(127,127,127,.29)',borderRadius:12,
          background:'rgba(127,127,127,.07)',padding:17}},
          h('div',{role:'status','aria-live':'polite',style:{fontWeight:650,fontSize:13}},status),
          h('div',{style:{marginTop:12,fontSize:12}},
            line('Installed (Host)', hostVersion ? 'v' + hostVersion : 'Unavailable'),
            line('Browser module', 'v' + INSTALLED_VERSION),
            line('Latest stable release', update.latest ? 'v' + update.latest : '—'),
            line('Last checked', update.checked || '—'),
            line('Update method', method)),
          hostVersion && hostVersion !== INSTALLED_VERSION
            ? h('p',{role:'note','data-version-mismatch':'',style:{...muted,marginTop:10}},
              'The Host reports v' + hostVersion + ' but this window runs browser module v' + INSTALLED_VERSION +
              '. Reload the window or restart Harness so both halves run the same version.') : null,
          phase==='error' ? h('p',{style:{...muted,marginTop:10}},update.message) : null,
          phase==='available' && action.phase !== 'confirm' && action.phase !== 'done' ? h('div',{style:{marginTop:12}},
            h('button',{type:'button','data-update-now':'',disabled:busy,
              style:buttonStyle,onClick:prepare},'Update now')) : null,
          action.phase==='checking'
            ? h('p',{role:'status',style:{...muted,marginTop:12}},'Verifying the release and this installation…') : null,
          action.phase==='error'
            ? h('p',{role:'alert',style:{...muted,marginTop:12}},action.message) : null,
          action.phase==='manual' ? h('div',{role:'alert','data-update-migration':'',style:{marginTop:12}},
            ...MIGRATION_STEPS.map((text,index)=>h('p',{key:index,style:{...muted,marginTop:index?8:0}},text)),
            h('p',{style:{...muted,marginTop:8}},'Pinned spec for v' + action.latest + ':'),
            h('code',{'data-pinned-spec':'',style:{display:'block',fontSize:12,overflowWrap:'anywhere',
              userSelect:'all',padding:'6px 8px',border:'1px solid ' + soft,borderRadius:6,marginTop:4}},action.spec)) : null,
          action.phase==='confirm' ? h('div',{role:'dialog','aria-label':'Confirm suite update',style:{marginTop:13}},
            h('p',{style:{fontSize:13,margin:'0 0 8px'}},'Install v'+action.latest+' over v'+currentVersion+' through the Harness Plugins Host?'),
            h('p',{style:muted},'The Host removes the installed version, installs the pinned commit, and reinstalls the '+
              'current version if that fails. A restart may be required.'),
            h('p',{style:{...muted,overflowWrap:'anywhere',marginTop:8}},'Pinned spec: '+action.spec),
            h('div',{style:{display:'flex',gap:8,marginTop:10}},
              h('button',{type:'button','data-confirm-update':'',style:buttonStyle,onClick:applyUpdate},
                'Confirm update'),
              h('button',{type:'button','data-cancel-update':'',style:buttonStyle,onClick:()=>setAction({phase:'idle'})},
                'Cancel'))) : null,
          action.phase==='installing'
            ? h('p',{role:'status',style:{...muted,marginTop:12}},'Updating through Harness Plugin Manager…') : null,
          action.phase==='done'
            ? h('p',{role:'status',style:{...muted,marginTop:12}},
              'Host applied the update to v'+action.latest+(action.restart ? '; restart Harness to finish.' : '.')) : null),
        h('p',{style:{...muted,marginTop:12}},
          'Checks stable GitHub Releases automatically on startup and every 24 hours. '+
          'Nothing is installed without your confirmation, and installation is always performed by Harness itself.'),
        h('a',{href:PROJECT_URL+'/releases',target:'_blank',rel:'noopener noreferrer',
          style:{display:'inline-block',fontSize:12,marginTop:8,color:'#69a9fc',
            textDecoration:'underline'}},'View published releases'))
    }

    function Details({ sessionId, projections, projectionState, sessions, workspaces }) {
      // Values come from the tab seat's Session-scoped `useProjection` hook when
      // the Host supplies it, else from this Session's list projection snapshot.
      const pressure = projections?.contextPressure
      const breakdown = projections?.contextBreakdown
      const tokenUsage = projections?.tokenUsage
      const session = sessions?.byId?.[sessionId]
      const folders = Array.isArray(workspaces?.items) ? workspaces.items : []
      const linked = folders.filter(w => Array.isArray(w.sessionIds) && w.sessionIds.includes(sessionId))
      const used = good(pressure?.projectedTokens ?? pressure?.pressureTokens)
      const max = good(pressure?.contextWindow)
      const pct = max && used !== undefined ? Math.min(100, Math.round(100 * used / max)) : undefined
      const platform = typeof navigator === 'object' ?
        (navigator.userAgentData?.platform || navigator.platform) : undefined
      const environment = [
        line('Browser', platform || 'Unavailable'),
        line('Workspaces', linked.length),
        ...linked.map(w => line('▣ ' + (w.title || 'Workspace'), w.path || '')),
      ]
      const context = []
      if (pct === undefined) {
        context.push(h('p', { key: 'no-pressure', style: muted, 'data-context-fallback': projectionState || 'empty' },
          projectionState === 'loading' ? 'Loading context usage for this Session…'
            : projectionState === 'error' || projectionState === 'migration-required'
              ? 'Context usage is unavailable for this Session.'
              : 'Context use is available after the model reports usage.'))
      } else {
        context.push(line(pct + '% used', '~' + compact(used) + ' / ' + compact(max)))
        context.push(h('div', { role: 'progressbar', 'aria-label': 'Context occupancy',
          'aria-valuenow': pct, 'aria-valuemin': 0, 'aria-valuemax': 100,
          style: { background: 'rgba(127,127,127,.25)', borderRadius: 8,
            height: 6, overflow: 'hidden', margin: '7px 0' } },
          h('div', { style: { width: pct + '%', height: '100%', background: '#378fdb' } })))
        context.push(line('Messages (estimated)', compact(breakdown?.messageTokens)))
        context.push(line('Tool schemas (estimated)', compact(breakdown?.toolsTokens)))
        context.push(line('System prompt (estimated)', compact(breakdown?.systemTokens)))
        context.push(line('Free space', compact(Math.max(0, max - used))))
      }
      context.push(line('Session', session?.displayTitle || 'Unavailable'))
      context.push(line('Status', session ? (session.running ? 'Running' : 'Idle') : 'Unavailable'))
      const outputs = [
        line('Output tokens', compact(tokenUsage?.outputTokens)),
        line('Last activity', good(session?.updatedAt) === undefined ?
          'Unavailable' : new Date(session.updatedAt).toLocaleString()),
        h('p', { key: 'output-note', style: muted },
          'Output file lists require a separate, permission-checked files service.'),
      ]
      const cards = [
        section('Environment', environment),
        section('Context', context),
        section('Connectors', [h('p', { key: 'conn', style: muted },
          'Connector inventory is not available via the documented Client APIs used here.')]),
        section('Outputs', outputs),
        section('Changes', [h('p', { key: 'diff', style: muted },
          'Git changes need the workspace-changes/Forge integration; no changes are invented.')]),
      ]
      return h('aside', { 'data-environment-right-sidebar': '',
        style: { height: '100%', overflowY: 'auto', boxSizing: 'border-box',
          padding: '6px 16px 22px', color: 'inherit', fontSize: 12, lineHeight: 1.6 } },
        ...cards,
        h('p', { style: muted }, 'Read-only · No external requests from this Session panel.'))
    }
    function HeaderButton({ openInspector }) {
      return h('button', { type: 'button', onClick: openInspector,
        'aria-label': 'Open Environment sidebar', title: 'Environment',
        'data-environment-header-action': '',
        style: { background: 'transparent', border: 0, color: 'inherit',
          display: 'inline-flex', justifyContent: 'center', alignItems: 'center',
          width: 30, height: 30, cursor: 'pointer' } },
        h(Icon, { size: 17 }))
    }
    const environmentPlugin = {
      inject: ['slots', 'sidebarRight', 'sidebarRightTabs', 'sessions', 'workspaces'],
      apply(ctx) {
        const s = ctx.sessions.list
        const w = ctx.workspaces.list
        const subS = l => s.subscribe(l)
        const subW = l => w.subscribe(l)
        const getS = () => s.getSnapshot()
        const getW = () => w.getSnapshot()
        const open = () => ctx.sidebarRight.openTab(KIND)
        // `sidebar.right.pane.tab` is a strict Session-scope seat: the Harness
        // standard kit passes `sessionId` and the Session-bound `useProjection`
        // hook (ui-session SessionStandardProps). The hook re-renders this body
        // as projection frames arrive after each model response. Whether the
        // hook exists is fixed for a registration, so the hook order is stable.
        function useLiveProjections(useProjection) {
          if (typeof useProjection !== 'function') return undefined
          return {
            contextPressure: useProjection('contextPressure'),
            contextBreakdown: useProjection('contextBreakdown'),
            tokenUsage: useProjection('tokenUsage'),
          }
        }
        function Body(props) {
          const sessions = React.useSyncExternalStore(subS, getS, getS)
          const workspaces = React.useSyncExternalStore(subW, getW, getW)
          const live = useLiveProjections(props.useProjection)
          const sessionId = props.sessionId
          const listed = sessions?.projectionsBySession?.[sessionId]
          const fallback = listed?.values ?? sessions?.byId?.[sessionId]?.projectionValues
          const projections = live && (live.contextPressure || live.contextBreakdown || live.tokenUsage)
            ? live : fallback
          return h(Details, { sessionId, projections, projectionState: listed?.state, sessions, workspaces })
        }
        ctx.effect(() => ctx.sidebarRightTabs.register({
          id: TYPE + '/environment-context', kind: KIND, title: () => 'Environment & Context',
          guide: [{ id: 'open', order: 12, title: () => 'Environment & Context',
            description: () => 'Current context and workspace details' }],
        }), 'environment-sidebar: type')
        ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
          // The keyed seat dispatches by the tab TYPE id, not its package root.
          name: 'sidebar.right.pane.tab', key: TYPE + '/environment-context',
          inject: sessionId => ({ sessionId }),
        }, Body))
        ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'environment-sidebar-toggle', order: 35,
          inject: () => ({ openInspector: open }),
        }, HeaderButton))
        ctx.effect(() => {
          const visited = new Set()
          const timers = new Set()
          let done = false
          const onSession = () => {
            const id = ctx.sidebarRight.mounted.getSnapshot()
            if (!id || visited.has(id)) return
            visited.add(id)
            const timeout = setTimeout(() => {
              timers.delete(timeout)
              if (done || ctx.sidebarRight.mounted.getSnapshot() !== id) return
              try { open() } catch (e) {
                visited.delete(id)
                console.warn('[environment-sidebar] auto-open unavailable:', e)
              }
            }, 0)
            timers.add(timeout)
          }
          const unsubscribe = ctx.sidebarRight.mounted.subscribe(onSession)
          onSession()
          return () => {
            done = true
            unsubscribe()
            for (const id of timers) clearTimeout(id)
          }
        }, 'environment-sidebar: initial view')
      },
    }

    // Native settings editor. Only the official settings Remote writes values. No agent capabilities.
    // Registered only by `profilePlugin`, i.e. only while the Host Personal Profile row is On.
    const PROFILE_PANEL_ID = TYPE + '/personal-profile-page'
    function ProfilePanelIcon({ size = 20 }) {
      return h('svg', { width: size, height: size, viewBox: '0 0 24 24',
        fill: 'none', stroke: 'currentColor', strokeWidth: 1.8,
        strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true },
      h('rect', { x: 3, y: 2.5, width: 18, height: 19, rx: 3 }),
      h('circle', { cx: 9, cy: 9, r: 2 }),
      h('path', { d: 'M5.5 16c.6-2.8 6.4-2.8 7 0M14 8h4M14 12h4M14 16h4' }))
    }
    // Preference catalog and renderer mirrored in preferences.js; parity is tested.
    // Neutral values generate no extra preference text.
    const PROFILE_STYLES = [
      ['default','الافتراضي','Default',''],
      ['professional','احترافي','Professional','Use polished, precise, professional language.'],
      ['friendly','ودود','Friendly','Use a friendly, approachable tone.'],
      ['candid','صريح ومباشر','Candid','Be direct, constructive, and candid.'],
      ['creative','إبداعي','Creative','Go beyond the obvious: include at least one fresh, unconventional idea suited to the task.'],
      ['efficient','مختصر وعملي','Efficient','Be concise, practical, and focused on the result.'],
      ['critical','ناقد وتحليلي','Critical','Evaluate assumptions, evidence, and tradeoffs critically.'],
      ['technical','تقني ومتخصص','Technical','Use precise technical terminology and explain relevant implementation details.'],
    ]
    const PROFILE_LANGUAGES = [
      ['auto','تلقائي — لغة المستخدم','Automatic — user language',''],
      ['ar','العربية — Arabic','العربية — Arabic','Arabic'],
      ['en','English','English','English'],
      ['zh','中文 — Chinese','中文 — Chinese','Chinese'],
      ['es','Español — Spanish','Español — Spanish','Spanish'],
      ['fr','Français — French','Français — French','French'],
      ['de','Deutsch — German','Deutsch — German','German'],
      ['ja','日本語 — Japanese','日本語 — Japanese','Japanese'],
    ]
    const PROFILE_TRAITS = [
      ['warmth','الودّ','Warmth','Keep the tone neutral and reserved, without reassurance or pep talk.','Use a warmer, more approachable tone.'],
      ['enthusiasm','الحماس','Enthusiasm','Use a calm, restrained tone.','Use a more energetic tone when appropriate.'],
      ['structure','العناوين والقوائم','Headers and lists','Prefer cohesive prose over unnecessary headings or lists.','Use headings and lists when they improve readability.'],
      ['emoji','الرموز التعبيرية','Emoji','Avoid unnecessary emoji.','Use appropriate emoji sparingly when suitable for the task.'],
      ['detail','مستوى التفصيل','Detail','Prefer shorter answers when sufficient.','Provide more detail when useful.'],
      ['critical','التفكير النقدي','Critical thinking','Focus on the requested task without unnecessary critique.','Actively examine assumptions and identify meaningful risks.'],
    ]
    const PROFILE_PRESETS = [
      ['critical','التفكير النقدي','Critical Thinking','اختبر الافتراضات ولا توافق تلقائيًا.','Challenge weak assumptions rather than agreeing automatically.'],
      ['no-fluff','دون حشو','No Fluff','تجنّب الحشو والمجاملات غير الضرورية.','Avoid filler and unnecessary compliments.'],
      ['grill-me','مراجعة المتطلبات','Grill-Me Mode','ناقش المتطلبات والمخاطر في القرارات المعقدة.','Before recommending a decision or plan, ask the user 2-3 specific questions about missing requirements and name the key risks.'],
      ['evidence','الأدلة أولًا','Evidence First','ميّز بين الأدلة والافتراضات وعدم اليقين.','Distinguish evidence, assumptions, and uncertainty; cite reliable sources when applicable.'],
      ['steps','خطوة بخطوة','Step-by-Step','اشرح المهام المعقدة بخطوات عملية.','Break complex tasks into actionable steps.'],
      ['action','التركيز على النتائج','Action Oriented','ركّز على الحلول والخطوات العملية.','Prioritize practical solutions and actionable next steps.'],
      ['code','مراجعة الكود','Code Reviewer','راجع الجودة والأمان والاختبارات.','Assess code quality, security, performance, and test coverage when reviewing code.'],
      ['humanizer','صياغة طبيعية','Humanizer','حسّن الصياغة دون تغيير الوقائع؛ لا يستدعي المهارة.','Prefer natural writing and preserve facts, citations, and uncertainty when editing.'],
    ]
    function neutralProfilePreferences() {
      return {style:'default', responseLanguage:'auto',
        traits:Object.fromEntries(PROFILE_TRAITS.map(([key])=>[key,1])),
        presets:[], custom:''}
    }
    function previewProfilePreferences(pref) {
      const lines = []
      const style = PROFILE_STYLES.find(item=>item[0]===pref.style)
      const language = PROFILE_LANGUAGES.find(item=>item[0]===pref.responseLanguage)
      if(style?.[3]) lines.push(style[3])
      if(language?.[3]) {
        const native=language[1].split(' — ')[0]
        lines.push('Write your response in '+language[3]+(native===language[3]?'':' ('+native+')')+' even when the user writes in another language, unless the user explicitly asks for a different language.')
      }
      for(const [key,,,less,more] of PROFILE_TRAITS) {
        if(pref.traits[key]===0) lines.push(less)
        if(pref.traits[key]===2) lines.push(more)
      }
      for(const [key,,,,instruction] of PROFILE_PRESETS) {
        if(pref.presets.includes(key)) lines.push(instruction)
      }
      if(pref.sendCustom===true && pref.custom.trim()) lines.push(pref.custom)
      return lines.length ? ['Response preferences (follow the current request and higher-priority host/safety/tool requirements; custom guidance takes precedence over other style preferences where compatible).',...new Set(lines)].join('\n') : ''
    }
    const PROFILE_NS = 'abinadwan-personal-profile'
    const PERSONAL_FIELDS = ['preferredName','nationality','gender']
    const POLICY_VALUES = ['private','ask_first','allow']
    const GENDER_VALUES = ['','male','female','unspecified']
    // Record v2 (0.7.2): one unified profile in the active Harness Profile.
    // No Workspace dependency: the same information, preferences and policies
    // apply to eligible native agent steps. Structured personal fields remain local.
    const PROFILE_VERSION = 2
    const PROFILE_CUSTOM_MAX = 8192
    const privatePolicies = () => Object.fromEntries(PERSONAL_FIELDS.map(key=>[key,'private']))
    const emptyInformation = () => ({preferredName:'',nationality:'',gender:''})
    const emptyProfileRecord = () => ({version:PROFILE_VERSION,locale:'ar',information:emptyInformation(),
      preferences:neutralProfilePreferences(),policies:privatePolicies(),allowPersonalInformation:false,allowCloud:false})
    // Payload guard for the serialized record (UTF-16 units) and for restore
    // text/files. Large enough for any v1 record with many Workspace rows.
    const PROFILE_MAX_CHARS = 3_000_000
    const profileTooLarge = value => JSON.stringify(value).length > PROFILE_MAX_CHARS
    const sameJson = (a,b) => JSON.stringify(a)===JSON.stringify(b)
    const profileKeys = (value,keys) => value && typeof value==='object' && !Array.isArray(value) &&
      Object.keys(value).length===keys.length && keys.every(key=>Object.hasOwn(value,key))
    // Errors carry a reason code only; never user-supplied content.
    const profileError = code => Object.assign(new Error('Invalid Personal Profile settings'),{code})
    const profileCheck = (condition,code='invalidContent') => { if(!condition) throw profileError(code) }
    const validText = (v,n) => typeof v==='string' && v.length<=n
    // Decoders rebuild every object in canonical key order, so comparisons of
    // what was sent and what the Host committed never depend on key order.
    function decodePreferences(p) {
      const keys=['style','responseLanguage','traits','presets','custom']
      if(p&&Object.hasOwn(p,'sendCustom'))keys.push('sendCustom')
      profileCheck(profileKeys(p,keys)&&(!Object.hasOwn(p,'sendCustom')||typeof p.sendCustom==='boolean'))
      profileCheck(PROFILE_STYLES.some(i=>i[0]===p.style)&&PROFILE_LANGUAGES.some(i=>i[0]===p.responseLanguage))
      profileCheck(profileKeys(p.traits,PROFILE_TRAITS.map(i=>i[0])) &&
        Object.values(p.traits).every(n=>[0,1,2].includes(n)))
      profileCheck(Array.isArray(p.presets)&&p.presets.length<=8&&new Set(p.presets).size===p.presets.length&&
        p.presets.every(id=>PROFILE_PRESETS.some(i=>i[0]===id)))
      profileCheck(validText(p.custom,PROFILE_CUSTOM_MAX),typeof p.custom==='string'?'instructionsTooLong':'invalidContent')
      return {style:p.style,responseLanguage:p.responseLanguage,
        traits:Object.fromEntries(PROFILE_TRAITS.map(([key])=>[key,p.traits[key]])),presets:[...p.presets],custom:p.custom,...(p.sendCustom===true?{sendCustom:true}:{})}
    }
    function withoutCustomConsent(p) { const {sendCustom,...rest}=p; return rest }
    function decodeInformation(i) {
      profileCheck(profileKeys(i,PERSONAL_FIELDS)&&validText(i.preferredName,128)&&validText(i.nationality,128)&&GENDER_VALUES.includes(i.gender))
      return {preferredName:i.preferredName,nationality:i.nationality,gender:i.gender}
    }
    function decodePolicies(p) {
      profileCheck(profileKeys(p,PERSONAL_FIELDS),'invalidPolicy')
      profileCheck(PERSONAL_FIELDS.every(key=>POLICY_VALUES.includes(p[key])),'invalidPolicy')
      return Object.fromEntries(PERSONAL_FIELDS.map(key=>[key,p[key]]))
    }
    function profileRoot(value) {
      profileCheck(value!==null&&typeof value==='object'&&!Array.isArray(value))
      profileCheck(!profileTooLarge(value),'tooLarge')
    }
    /** Strict v2 decoder (wire and backup). Unknown fields are rejected. */
    function decodeProfile(value) {
      profileRoot(value)
      profileCheck(value.version===PROFILE_VERSION,'unsupportedVersion')
      profileCheck(profileKeys(value,['version','locale','information','preferences','policies','allowPersonalInformation','allowCloud']))
      profileCheck(['ar','en'].includes(value.locale)&&typeof value.allowPersonalInformation==='boolean'&&typeof value.allowCloud==='boolean')
      return {version:PROFILE_VERSION,locale:value.locale,information:decodeInformation(value.information),
        preferences:decodePreferences(value.preferences),policies:decodePolicies(value.policies),
        allowPersonalInformation:value.allowPersonalInformation,allowCloud:value.allowCloud}
    }
    /** Strict decoder of the 0.7.0/0.7.1 record (v1). Used to migrate, never to save. */
    function decodeLegacyProfile(value) {
      profileRoot(value)
      profileCheck(value.version===1,'unsupportedVersion')
      profileCheck(profileKeys(value,['version','locale','information','global','workspaces','allowPersonalInformation','allowCloud']))
      profileCheck(['ar','en'].includes(value.locale)&&typeof value.allowPersonalInformation==='boolean'&&typeof value.allowCloud==='boolean')
      profileCheck(Array.isArray(value.workspaces))
      const seen=new Set()
      const workspaces=value.workspaces.map(w=>{
        profileCheck(profileKeys(w,['id','override','preferences','policies'])&&validText(w.id,256)&&w.id.length>0&&
          !seen.has(w.id)&&typeof w.override==='boolean')
        seen.add(w.id)
        return {id:w.id,override:w.override,preferences:decodePreferences(w.preferences),policies:decodePolicies(w.policies)}
      })
      return {version:1,locale:value.locale,information:decodeInformation(value.information),global:decodePreferences(value.global),
        workspaces,allowPersonalInformation:value.allowPersonalInformation,allowCloud:value.allowCloud}
    }
    function decodeAnyProfile(value) {
      profileRoot(value)
      return value.version===1 ? {legacy:decodeLegacyProfile(value)} : {record:decodeProfile(value)}
    }
    // v1 -> v2. Keeps information, locale and global preferences (including
    // custom instructions). Workspace rows are never merged or promoted:
    // unified policies start Private and both switches Off, because consent
    // given under the per-Workspace model does not carry over.
    function migrateLegacyProfile(legacy) {
      return {version:PROFILE_VERSION,locale:legacy.locale,information:{...legacy.information},
        preferences:withoutCustomConsent(decodePreferences(legacy.global)),policies:privatePolicies(),allowPersonalInformation:false,allowCloud:false}
    }
    /** Workspace-specific data or permissions that a migration would discard. */
    const legacyDiscards = legacy => legacy.workspaces.length>0||legacy.allowPersonalInformation||legacy.allowCloud
    function profileView(view) {
      if(view?.ns!==PROFILE_NS || !Number.isSafeInteger(view.revision)||view.revision<0||!profileKeys(view.value,['record'])) throw new Error('Settings unavailable')
      const decoded=decodeAnyProfile(view.value.record)
      return {revision:view.revision,record:decoded.record||null,legacy:decoded.legacy||null}
    }
    // Appends imported custom instructions to the existing text. Paragraphs
    // (blocks separated by a blank line) whose trimmed text already exists are
    // skipped; line breaks and indentation inside blocks are kept. Never truncates.
    function mergeInstructions(existing,imported) {
      const a=String(existing).replace(/\r\n?/g,'\n'), b=String(imported).replace(/\r\n?/g,'\n')
      if(!b.trim()) return a
      if(!a.trim()) return b
      const split = text => text.split(/\n[ \t]*\n/)
      const known=new Set(split(a).map(x=>x.trim()).filter(Boolean))
      const added=[]
      for(const block of split(b)){
        const key=block.trim()
        if(!key||known.has(key))continue
        known.add(key);added.push(block.replace(/^\n+/,'').replace(/\s+$/,''))
      }
      return added.length ? a.replace(/\s+$/,'')+'\n\n'+added.join('\n\n') : a
    }
    const JSON_STYLE = {direction:'ltr',textAlign:'left',unicodeBidi:'isolate',whiteSpace:'pre',overflowWrap:'normal',
      fontFamily:'ui-monospace,"Cascadia Mono","Cascadia Code",Consolas,"Courier New",monospace',fontSize:12.5,lineHeight:1.5,tabSize:2}
    const backupFileName = legacy => legacy ? 'personal-profile-v0.7.1-settings.json' : 'personal-profile-backup.json'
    /** Browser-native download (Blob + object URL + <a download>). No filesystem service. */
    function downloadJson(event,text,fileName) {
      const doc=event?.currentTarget?.ownerDocument, win=doc?.defaultView
      if(!doc?.body||typeof win?.Blob!=='function'||typeof win.URL?.createObjectURL!=='function')return false
      const url=win.URL.createObjectURL(new win.Blob([text],{type:'application/json'}))
      const anchor=doc.createElement('a')
      anchor.href=url;anchor.download=fileName;anchor.rel='noopener';anchor.style.display='none'
      doc.body.appendChild(anchor);anchor.click();anchor.remove()
      win.setTimeout(()=>win.URL.revokeObjectURL?.(url),1000)
      return true
    }
    async function copyJson(event,text) {
      const clipboard=event?.currentTarget?.ownerDocument?.defaultView?.navigator?.clipboard
      if(typeof clipboard?.writeText!=='function')return false
      await clipboard.writeText(text)
      return true
    }
    function readFileText(file,win) {
      if(typeof file.text==='function')return file.text()
      if(typeof win?.FileReader!=='function')return Promise.reject(new Error('No reader'))
      return new Promise((resolve,reject)=>{
        const reader=new win.FileReader()
        reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(new Error('Read failed'))
        reader.readAsText(file)
      })
    }
    function PersonalProfilePage({settings,connectionSource,useRemoteAccess}) {
      const canRead=typeof useRemoteAccess==='function' ? useRemoteAccess('settings/describe') : false
      const canWrite=typeof useRemoteAccess==='function' ? useRemoteAccess('settings/replace') : false
      const generation=React.useSyncExternalStore(connectionSource.subscribe,connectionSource.getSnapshot,connectionSource.getSnapshot)
      const [record,setRecord]=React.useState(emptyProfileRecord)
      const [saved,setSaved]=React.useState(null)
      const [legacy,setLegacy]=React.useState(null)
      const [migrationAck,setMigrationAck]=React.useState(false)
      const [legacyView,setLegacyView]=React.useState(false)
      const [revision,setRevision]=React.useState(null)
      const [status,setStatus]=React.useState('loading')
      const [page,setPage]=React.useState('information')
      const [exportView,setExportView]=React.useState(false)
      const [backupMessage,setBackupMessage]=React.useState('')
      const [restoreText,setRestoreText]=React.useState('')
      const [restoreStrategy,setRestoreStrategy]=React.useState('replace')
      const [restoreReview,setRestoreReview]=React.useState(null)
      const [restoreAck,setRestoreAck]=React.useState(false)
      const [restorePermissions,setRestorePermissions]=React.useState(false)
      const [permissionsAck,setPermissionsAck]=React.useState(false)
      const [mergedText,setMergedText]=React.useState('')
      const request=React.useRef(0)
      const inFlight=React.useRef(false)
      const access=React.useRef({canRead,canWrite,generation})
      access.current={canRead,canWrite,generation}
      const lifetimeValid = g=>connectionSource.getSnapshot()===g&&access.current.canRead
      const clearRestore=()=>{setRestoreReview(null);setRestoreAck(false);setRestorePermissions(false);setPermissionsAck(false);setMergedText('')}
      const load = async () => {
        const id=++request.current,g=connectionSource.getSnapshot()
        inFlight.current=true;setConfirmReload(false);setStatus('loading');setRevision(null);setSaved(null)
        setRecord(emptyProfileRecord());setLegacy(null);setMigrationAck(false);setLegacyView(false)
        setExportView(false);setBackupMessage('');setRestoreText('');clearRestore()
        if(!access.current.canRead){inFlight.current=false;setStatus('unavailable');return}
        try {
          const response=await settings.describe()
          if(id!==request.current||!lifetimeValid(g))return
          if(response?.ok!==true||!Array.isArray(response.value?.namespaces))throw new Error('Unavailable')
          const snapshot=profileView(response.value.namespaces.find(x=>x.ns===PROFILE_NS))
          if(response.value.writable!==true)throw new Error('Read only')
          if(snapshot.legacy){
            // Stored v1 stays untouched until the user reviews and Saves.
            setRecord(migrateLegacyProfile(snapshot.legacy));setSaved(snapshot.legacy);setLegacy(snapshot.legacy)
            setRevision(snapshot.revision);setStatus('migration')
          }else{setRecord(snapshot.record);setSaved(snapshot.record);setRevision(snapshot.revision);setStatus('ready')}
        } catch {if(id===request.current&&lifetimeValid(g))setStatus('unavailable')}
        finally {if(id===request.current)inFlight.current=false}
      }
      const [confirmReload,setConfirmReload]=React.useState(false)
      const dirtyRef=React.useRef(false)
      React.useEffect(()=>{
        // A reconnect or access change re-reads only a clean page. A dirty draft
        // stays on screen: Save remains revision-checked, Reload asks first.
        if(dirtyRef.current){
          request.current++;inFlight.current=false
          setStatus(access.current.canRead?'reconnected':'unavailable')
        }else void load()
        return()=>{request.current++;inFlight.current=false}
      },[canRead,generation])
      const migrationBlocked=legacy!==null&&legacyDiscards(legacy)&&!migrationAck
      const save = async () => {
        if(inFlight.current||revision===null||!canRead||!canWrite||generation!==connectionSource.getSnapshot()||migrationBlocked)return
        let next
        try{if(profileTooLarge(record)){setStatus('tooLarge');return}next=decodeProfile(record)}catch{setStatus('invalid');return}
        const id=++request.current,g=generation
        inFlight.current=true;setStatus('saving')
        try{
          const response=await settings.replace(PROFILE_NS,{record:next},revision)
          if(id!==request.current||!lifetimeValid(g))return
          if(response?.ok!==true){
            setStatus(response?.error?.code==='settings/conflict'?'conflict':'failed');return
          }
          const snapshot=profileView(response.value)
          if(!snapshot.record||!sameJson(snapshot.record,next))throw new Error('Unconfirmed write')
          setRecord(snapshot.record);setSaved(snapshot.record);setRevision(snapshot.revision)
          setLegacy(null);setMigrationAck(false);setLegacyView(false);setStatus('saved')
        }catch{if(id===request.current&&lifetimeValid(g))setStatus('failed')}
        finally{if(id===request.current)inFlight.current=false}
      }
      const language=record.locale,values=record.information,preferences=record.preferences
      const busy=status==='loading'||status==='saving'
      const editable=canRead&&canWrite&&revision!==null&&!busy&&generation===connectionSource.getSnapshot()
      const dirty=saved!==null&&!sameJson(record,saved)
      dirtyRef.current=dirty
      const unsavedWork=dirty||status==='failed'||status==='conflict'||status==='reconnected'
      const requestReload=()=>{if(unsavedWork)setConfirmReload(true);else void load()}
      const setLanguage=v=>setRecord(old=>({...old,locale:v}))
      const setPreferences=updater=>setRecord(old=>({...old,preferences:updater(old.preferences)}))
      const setField=(id,value)=>setRecord(old=>({...old,information:{...old.information,[id]:value}}))
      const ar = {
        information:'معلوماتي', instructions:'تعليمات الوكيل', access:'التحكم في الوصول', backup:'النسخ والاستعادة', privacy:'الخصوصية والأمان',title:'الملف الشخصي',
        subtitle:'ملف شخصي موحّد ضمن ملف Harness الحالي',warning:'يُحفظ هذا المحتوى محليًا دون تشفير خاص بالإضافة. لا تكتب كلمات مرور أو مفاتيح أو معلومات حساسة. تُرسل تفضيلات الرد المحفوظة إلى النموذج المختار وقد تبقى في سجل المحادثة. حقول المعلومات الشخصية لا تُرسل.',
        language:'لغة الواجهة',preferredName:'الاسم المفضل',nationality:'الجنسية',gender:'الجنس',male:'ذكر',female:'أنثى',unspecified:'أفضّل عدم الذكر',
        unified:'إعدادات موحّدة',unifiedHint:'تُطبّق التفضيلات المحفوظة عند تجهيز الخطوة التالية في المحادثات الأصلية المدعومة، دون اختيار مساحة عمل. قد تتجاوزها بعض إعدادات الوكيل الخاصة.',
        personality:'الشخصية',styleTone:'الأسلوب والنبرة',responseLanguage:'لغة الردود',characteristics:'خصائص الردود',presets:'خيارات سلوكية جاهزة',customInstructions:'تعليمات مخصصة',
        sendCustom:'أوافق على إرسال النص المخصص للنموذج المختار (بما فيه السحابي)',customConsentHint:'النص قد يبقى في سجل المحادثة ويعاد إرساله لاحقًا. لا تضع بيانات حساسة. تعديل النص أو استعادته يلغي الإذن؛ احفظ بعد المراجعة.',
        less:'أقل',neutral:'متوازن',more:'أكثر',characters:'حرف',
        preferenceHint:'كل الاختيارات اختيارية وتُطبّق بعد الحفظ.',languageHint:'لغة الردود مستقلة عن لغة الواجهة. اللهجة تُكتب ضمن التعليمات.',
        previewHint:'معاينة المسودة التي ستُرسل بعد الحفظ في المحادثات المدعومة؛ لا تُحذف التعليمات السابقة من السجل.',presetHint:'لا اختيار افتراضيًا.',resetPreferences:'إعادة ضبط التفضيلات',
        effective:'المعاينة النهائية',optIn:'السماح باستخدام المعلومات الشخصية (إعداد محفوظ، غير مفعّل في الوكيل)',
        fieldPolicies:'صلاحيات الحقول',policiesHint:'صلاحية واحدة لكل حقل تنطبق على الملف كله، لا على مساحة عمل بعينها.',private:'خاص',ask:'اسأل أولًا',allow:'سماح',on:'مفعّل',off:'متوقف',
        cloud:'السماح بإرسال المعلومات الشخصية إلى مزود سحابي (إعداد محفوظ، غير مفعّل)',accessHint:'لا يتم الوصول للمعلومات أو إرسالها حاليًا. صلاحيات المرحلة السابعة محفوظة فقط: الإفصاح محظور لأن Harness لا يضمن عزل السجل عند تغيير الصلاحية أو المزود. حتى «سماح» لا يرسل الحقول.',
        exportTitle:'تصدير نسخة احتياطية',exportHint:'ملف JSON غير مشفّر. يحتوي معلوماتك الشخصية وتعليماتك وصلاحيات الوصول المحفوظة كما هي. احفظه في مكان آمن ولا تشاركه.',
        download:'تنزيل ملف JSON',copy:'نسخ JSON',view:'عرض JSON',hideView:'إخفاء JSON',exportJson:'نسخة JSON',
        importTitle:'استيراد واستعادة',importHint:'اختر ملف JSON أو الصقه، ثم راجعه. لا يُحفظ شيء قبل الضغط على «حفظ التغييرات».',
        importFile:'استيراد ملف JSON',pasteJson:'لصق JSON يدويًا',import:'مراجعة النسخة',cancelRestore:'إلغاء الاستعادة',
        strategy:'طريقة الاستعادة',replaceAll:'استبدال الكل',replaceAllHint:'تحل الإعدادات المستوردة محل الحالية، ويُلغى إذن إرسال النص المخصص.',
        replaceMerge:'استبدال الكل مع دمج التعليمات المخصصة',replaceMergeHint:'يُلغى إذن إرسال النص المخصص عند الاستعادة. تُستبدل كل الإعدادات عدا التعليمات المخصصة: يبقى نصك الحالي وتُضاف إليه الفقرات المستوردة غير المكررة.',
        previewTitle:'معاينة الاستعادة',setting:'الإعداد',current:'المسودة الحالية',proposed:'بعد الاستعادة',interfaceLanguage:'لغة الواجهة',
        mergedLabel:'التعليمات بعد الدمج (قابلة للتعديل)',importedInstructions:'التعليمات المستوردة',none:'لا شيء',empty:'—',
        permissionsTitle:'الصلاحيات المحفوظة في النسخة',restorePermissions:'استعادة الصلاحيات المحفوظة في هذه النسخة',
        permissionsDefault:'افتراضيًا تُعاد كل الصلاحيات إلى «خاص» ويبقى المفتاحان متوقفين.',permissionsAck:'أفهم أن هذه الصلاحيات ستُحفظ كتفضيلات فقط، وأنها لا تُفعّل أي وصول للوكيل أو إرسال سحابي.',
        permissionsLegacy:'هذه النسخة من الإصدار 0.7.1 ولا تحوي صلاحيات موحّدة؛ تُستعاد كل الصلاحيات «خاص» والمفتاحان متوقفان.',
        legacyEntries:'إعدادات خاصة بمساحات العمل في هذه النسخة لن تُستعاد:',
        confirm:'راجعت هذه النسخة وأوافق على تطبيقها على المسودة.',applyRestore:'تطبيق الاستعادة على المسودة',
        reviewReady:'النسخة صالحة. راجع المعاينة ثم طبّقها.',restoreApplied:'طُبّقت الاستعادة على المسودة فقط. لم يُحفظ شيء بعد: اضغط «حفظ التغييرات».',
        invalidJson:'النص ليس JSON صالحًا.',unsupportedVersion:'إصدار النسخة غير مدعوم.',invalidPolicy:'النسخة تحتوي صلاحية غير صالحة أو غير مدعومة.',
        instructionsTooLong:'التعليمات المخصصة في النسخة أطول من 8192 حرفًا. لم يُقتطع شيء ولم تُطبّق النسخة.',invalidContent:'محتوى النسخة غير صالح أو يحتوي حقولًا غير معروفة.',
        mergeTooLong:'التعليمات بعد الدمج أطول من 8192 حرفًا. اختصرها قبل التطبيق؛ لن يُقتطع أي نص تلقائيًا.',
        fileTooLarge:'الملف أكبر من الحد المسموح (3,000,000 بايت).',fileReadFailed:'تعذرت قراءة الملف.',
        copied:'نُسخ JSON إلى الحافظة.',copyFailed:'تعذر النسخ إلى الحافظة. استخدم «عرض JSON» وانسخ النص يدويًا.',
        downloaded:'بدأ تنزيل الملف. تأكد من حفظه.',downloadFailed:'التنزيل غير متاح هنا. استخدم «نسخ JSON» أو «عرض JSON».',
        migrationTitle:'ترحيل الإعدادات من الإصدار 0.7.1',
        migrationHint:'وُجدت إعدادات محفوظة بالصيغة القديمة المرتبطة بمساحات العمل. يحتفظ الترحيل بمعلوماتك الشخصية ولغة الواجهة والتفضيلات العامة والتعليمات المخصصة. لا تتغير الإعدادات المخزنة قبل الضغط على «حفظ التغييرات».',
        migrationKept:'لا توجد إعدادات خاصة بمساحات العمل؛ لن يُحذف شيء.',
        migrationDiscard:'لن تُنقل الإعدادات التالية إلى الملف الموحّد، وستُحذف عند الحفظ. صدّرها أولًا إن أردت الاحتفاظ بها:',
        migrationMasters:'مفاتيح المشاركة العامة كانت مفعّلة وستُعاد إلى «متوقف»؛ يمكنك تفعيلها لاحقًا من «التحكم في الوصول».',
        workspaceId:'معرّف مساحة العمل',overrideCol:'تخصيص',policiesCol:'الصلاحيات',yes:'نعم',no:'لا',
        legacyJson:'إعدادات 0.7.1 الكاملة (JSON)',migrationAck:'راجعت وصدّرت ما أحتاجه، وأوافق على حذف الإعدادات الخاصة بمساحات العمل وإيقاف مفاتيح المشاركة عند الحفظ.',
        migration:'إعدادات من إصدار سابق بانتظار الترحيل. راجعها ثم احفظ.',
        reset:'إعادة ضبط المسودة',missing:'غير محدد',noInstruction:'لا توجد تعليمات.',save:'حفظ التغييرات',reload:'إعادة التحميل (تجاهل المسودة)',
        loading:'جارٍ قراءة الإعدادات…',unavailable:'الإعدادات المحلية غير متاحة أو غير قابلة للكتابة. لم يتم حفظ شيء.',ready:'الإعدادات محمّلة.',saving:'جارٍ الحفظ…',saved:'تم تأكيد الحفظ من Harness.',
        failed:'تعذر تأكيد الحفظ. أعد التحميل للتحقق قبل المحاولة.',conflict:'تغيرت الإعدادات في نافذة أخرى. أعد التحميل ثم أعد تعديلها.',invalid:'الإعدادات أو النسخة غير صالحة.',dirty:'توجد تغييرات غير محفوظة.',
        tooLarge:'الإعدادات أكبر من الحد المسموح للحفظ. لم يُحفظ شيء، وبقيت تعديلاتك في المسودة.',
        reconnected:'أُعيد الاتصال. بقيت مسودتك في الصفحة: يمكنك الحفظ (يتحقق Harness من الإصدار) أو إعادة التحميل.',
        discardWarning:'لديك تغييرات غير محفوظة ستُفقد عند إعادة التحميل. للاحتفاظ بها انسخ نسخة JSON أولًا من «النسخ والاستعادة».',
        discardConfirm:'تجاهل التغييرات وإعادة التحميل',discardCancel:'متابعة التعديل',
      }
      const en = {
        information:'My Information',instructions:'Agent Instructions',access:'Access Control',backup:'Backup & Restore',privacy:'Privacy & Security',title:'Personal Profile',
        subtitle:'One unified profile in the active Harness Profile',warning:'Stored locally without plugin-level encryption. Do not enter passwords, keys or sensitive information. Saved response preferences are sent to the selected model and may remain in conversation history. Structured personal fields are not sent.',
        language:'Interface language',preferredName:'Preferred name',nationality:'Nationality',gender:'Gender',male:'Male',female:'Female',unspecified:'Prefer not to say',
        unified:'Unified preferences',unifiedHint:'Saved preferences apply at the next assembled step in supported native conversations, independent of Workspace. Some agent presets may override them.',
        personality:'Personality',styleTone:'Style and tone',responseLanguage:'Response language',characteristics:'Response characteristics',presets:'Behavior presets',customInstructions:'Custom instructions',
        sendCustom:'Allow sending custom text to selected models (including cloud)',customConsentHint:'Text can remain in conversation history and be replayed. Do not include sensitive data. Editing or restoring text clears consent; review and Save.',
        less:'Less',neutral:'Balanced',more:'More',characters:'characters',
        preferenceHint:'Optional choices apply after Save.',languageHint:'Response language is separate from interface language. Put dialect preferences in custom instructions.',
        previewHint:'Draft preview of what is contributed after Save in supported conversations. Earlier instructions are not erased from history.',presetHint:'None selected by default.',resetPreferences:'Reset preferences',
        effective:'Effective preview',optIn:'Allow use of personal information (saved preference, not active in agent)',
        fieldPolicies:'Field policies',policiesHint:'One policy per field for the whole profile, not per Workspace.',private:'Private',ask:'Ask First',allow:'Allow',on:'On',off:'Off',
        cloud:'Allow personal information to be sent to a cloud provider (saved preference, not active)',accessHint:'No information is disclosed or sent today from structured personal fields. Policies are saved only: disclosure is blocked because Harness cannot guarantee history isolation after permission or provider changes. Even Allow does not send fields.',
        exportTitle:'Export backup',exportHint:'The JSON file is not encrypted. It contains your personal information, instructions and saved access permissions exactly as set. Keep it somewhere safe and do not share it.',
        download:'Download JSON file',copy:'Copy JSON',view:'View JSON',hideView:'Hide JSON',exportJson:'JSON backup',
        importTitle:'Import and restore',importHint:'Choose a JSON file or paste JSON, then review it. Nothing is saved until you press Save changes.',
        importFile:'Import JSON file',pasteJson:'Paste JSON manually',import:'Review backup',cancelRestore:'Cancel restore',
        strategy:'Restore strategy',replaceAll:'Replace All',replaceAllHint:'Imported settings replace current settings, including custom instructions; custom-text sending consent is cleared.',
        replaceMerge:'Replace All and Merge Custom Instructions',replaceMergeHint:'Custom-text sending consent is cleared on restore. Replaces everything except custom instructions: your current text is kept and imported paragraphs that are not duplicates are appended.',
        previewTitle:'Restore preview',setting:'Setting',current:'Current draft',proposed:'After restore',interfaceLanguage:'Interface language',
        mergedLabel:'Merged instructions (editable)',importedInstructions:'Imported instructions',none:'None',empty:'—',
        permissionsTitle:'Permissions saved in this backup',restorePermissions:'Restore the permissions saved in this backup',
        permissionsDefault:'By default every policy is restored as Private and both switches stay Off.',permissionsAck:'I understand these permissions are saved as preferences only and do not enable any agent access or cloud disclosure.',
        permissionsLegacy:'This backup is from 0.7.1 and has no unified permissions; every policy is restored as Private and both switches Off.',
        legacyEntries:'Workspace-specific settings in this backup that will not be restored:',
        confirm:'I reviewed this backup and want to apply it to the draft.',applyRestore:'Apply restore to draft',
        reviewReady:'Backup is valid. Review the preview, then apply it.',restoreApplied:'Restore applied to the draft only. Nothing is saved yet: press Save changes.',
        invalidJson:'The text is not valid JSON.',unsupportedVersion:'Unsupported backup version.',invalidPolicy:'The backup contains an invalid or unsupported policy.',
        instructionsTooLong:'Custom instructions in the backup exceed 8192 characters. Nothing was truncated and the backup was not applied.',invalidContent:'The backup content is invalid or contains unknown fields.',
        mergeTooLong:'Merged instructions exceed 8192 characters. Shorten them before applying; nothing is truncated automatically.',
        fileTooLarge:'The file is larger than the allowed limit (3,000,000 bytes).',fileReadFailed:'The file could not be read.',
        copied:'JSON copied to the clipboard.',copyFailed:'Could not copy to the clipboard. Use View JSON and copy the text manually.',
        downloaded:'Download started. Make sure the file is saved.',downloadFailed:'Download is not available here. Use Copy JSON or View JSON.',
        migrationTitle:'Migrate settings from 0.7.1',
        migrationHint:'Settings stored in the earlier Workspace-based format were found. Migration keeps your personal information, interface language, global preferences and custom instructions. Stored settings do not change until you press Save changes.',
        migrationKept:'There are no Workspace-specific settings; nothing will be removed.',
        migrationDiscard:'The following settings do not move into the unified profile and are removed when you Save. Export them first if you want to keep them:',
        migrationMasters:'The sharing switches were On and will be reset to Off; you can enable them again in Access Control.',
        workspaceId:'Workspace ID',overrideCol:'Override',policiesCol:'Policies',yes:'Yes',no:'No',
        legacyJson:'Complete 0.7.1 settings (JSON)',migrationAck:'I reviewed and exported what I need, and agree to remove the Workspace-specific settings and turn the sharing switches Off when saving.',
        migration:'Settings from an earlier version await migration. Review them, then Save.',
        reset:'Reset draft',missing:'Not set',noInstruction:'No instructions.',save:'Save changes',reload:'Reload (discard draft)',
        loading:'Reading settings…',unavailable:'Local settings unavailable or not writable. Nothing saved.',ready:'Settings loaded.',saving:'Saving…',saved:'Save confirmed by Harness.',
        failed:'Save not confirmed. Reload to verify before retrying.',conflict:'Settings changed in another window. Reload and reapply edits.',invalid:'Invalid settings or backup.',dirty:'Unsaved changes.',
        tooLarge:'Settings are too large to save. Nothing was saved; your edits remain in the draft.',
        reconnected:'Connection was reset. Your draft is kept on this page: you can Save (Harness checks the revision) or Reload.',
        discardWarning:'You have unsaved changes that Reload will discard. To keep them, first export a JSON backup from Backup & Restore.',
        discardConfirm:'Discard changes and reload',discardCancel:'Keep editing',
      }
      const t = key => (language === 'ar' ? ar : en)[key] || key
      const rtl = language === 'ar'
      const surface = { border:'1px solid rgba(128,128,128,.3)', borderRadius:13,
        padding:20, background:'rgba(128,128,128,.045)', marginBottom:16 }
      const label = { display:'block', fontWeight:650, marginBottom:6, fontSize:13 }
      const control = { display:'block', width:'100%', boxSizing:'border-box',
        padding:'9px 11px', border:'1px solid rgba(128,128,128,.45)', borderRadius:8,
        background:'var(--dsh-input-bg, transparent)', color:'inherit', font:'inherit' }
      const jsonControl = {...control,...JSON_STYLE}
      const btn = { border:'1px solid rgba(128,128,128,.35)', borderRadius:8,
        padding:'9px 13px', font:'inherit', background:'rgba(128,128,128,.08)',
        color:'inherit', cursor:'pointer' }
      const row = {display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',margin:'12px 0'}
      const check = {display:'flex',gap:10,alignItems:'start',margin:'12px 0'}
      const cell = {padding:'6px 8px',borderBottom:'1px solid rgba(128,128,128,.25)',textAlign:'start',verticalAlign:'top',overflowWrap:'anywhere'}
      const sections = ['information','instructions','access','backup','privacy']
      const localLabel = item => item[rtl?1:2]
      const policyLabel = v => t({private:'private',ask_first:'ask',allow:'allow'}[v])
      const genderLabel = v => v ? t(v) : t('missing')
      function card(title, ...children) {
        return h('section', { style:surface, 'aria-label':title },
          h('h2', { style:{fontSize:17,margin:'0 0 13px'} }, title), ...children)
      }
      function input(key, title, value, change, props = {}) {
        return h('div', { key, style:{marginBottom:14,minWidth:0} },
          h('label', { htmlFor:'pp-'+key, style:label }, title),
          h('input', { id:'pp-'+key, style:control, type:'text', maxLength:128,
            value:value || '', onChange:e=>change(e.target.value), autoComplete:'off',
            dir:'auto', ...props }))
      }
      function dropdown(key, title, value, options, onChange) {
        return h('div', { key, style:{marginBottom:14} },
          h('label', { htmlFor:'pp-'+key, style:label }, title),
          h('select', { id:'pp-'+key, style:{...control,backgroundColor:'Field',color:'FieldText',colorScheme:'inherit'},
            value, onChange:e=>onChange(e.target.value) },
            options.map(([v,txt])=>h('option',{key:v,value:v,style:{backgroundColor:'Field',color:'FieldText'}},txt))))
      }
      function checkbox(id, checked, onChange, text, props = {}) {
        return h('div',{style:check},
          h('input',{id:'pp-'+id,type:'checkbox',checked,onChange:e=>onChange(e.target.checked),style:{marginTop:5},...props}),
          h('label',{htmlFor:'pp-'+id},text))
      }
      function jsonView(id, text, title) {
        return h('div',{style:{marginTop:12}},
          h('label',{htmlFor:'pp-'+id,style:label},title),
          h('textarea',{id:'pp-'+id,readOnly:true,rows:12,dir:'ltr',lang:'en',spellCheck:false,style:jsonControl,value:text}))
      }
      // Export/copy/view controls shared by the backup and the 0.7.1 migration review.
      function jsonActions(prefix, text, fileName, viewing, setViewing) {
        return h('div',{style:row},
          h('button',{id:'pp-'+prefix+'-download',type:'button',style:btn,onClick:e=>{
            let ok=false;try{ok=downloadJson(e,text(),fileName)}catch{ok=false}
            setBackupMessage(ok?'downloaded':'downloadFailed')}},t('download')),
          h('button',{id:'pp-'+prefix+'-copy',type:'button',style:btn,onClick:e=>{
            const pending=(async()=>copyJson(e,text()))()
            pending.then(ok=>setBackupMessage(ok?'copied':'copyFailed'),()=>setBackupMessage('copyFailed'))}},t('copy')),
          h('button',{id:'pp-'+prefix+'-view',type:'button',style:btn,'aria-expanded':viewing,
            'aria-controls':'pp-'+prefix+'-json',onClick:()=>setViewing(v=>!v)},viewing?t('hideView'):t('view')))
      }
      const notice = h('p', { role:'note', style:{padding:'12px 15px',
        border:'1px solid rgba(208,158,52,.7)', borderRadius:10,
        background:'rgba(208,158,52,.1)',fontSize:13,lineHeight:1.7} }, t('warning'))
      const backupStatus = backupMessage ? h('p',{id:'pp-backup-status',role:'status',style:{fontWeight:600}},t(backupMessage)) : null
      const exportText = () => JSON.stringify(decodeProfile(record),null,2)
      const legacyText = () => JSON.stringify(legacy,null,2)
      // ---- Restore preview helpers (read-only rendering) ----
      const summarize = r => {
        const p=r.preferences
        const traits=PROFILE_TRAITS.filter(([key])=>p.traits[key]!==1).map(item=>localLabel(item)+': '+t(['less','neutral','more'][p.traits[item[0]]]))
        const presets=PROFILE_PRESETS.filter(item=>p.presets.includes(item[0])).map(localLabel)
        return [
          ['preferredName',t('preferredName'),r.information.preferredName||t('empty')],
          ['nationality',t('nationality'),r.information.nationality||t('empty')],
          ['gender',t('gender'),genderLabel(r.information.gender)],
          ['locale',t('interfaceLanguage'),r.locale==='ar'?'العربية':'English'],
          ['style',t('styleTone'),localLabel(PROFILE_STYLES.find(i=>i[0]===p.style))],
          ['responseLanguage',t('responseLanguage'),localLabel(PROFILE_LANGUAGES.find(i=>i[0]===p.responseLanguage))],
          ['traits',t('characteristics'),traits.length?traits.join(rtl?'، ':', '):t('neutral')],
          ['presets',t('presets'),presets.length?presets.join(rtl?'، ':', '):t('none')],
          ['custom',t('customInstructions'),p.custom.length+' '+t('characters')],
          ['sendCustom',t('sendCustom'),p.sendCustom===true?t('on'):t('off')],
          ...PERSONAL_FIELDS.map(key=>['policy-'+key,t('fieldPolicies')+' — '+t(key),policyLabel(r.policies[key])]),
          ['allowPersonalInformation',t('optIn'),r.allowPersonalInformation?t('on'):t('off')],
          ['allowCloud',t('cloud'),r.allowCloud?t('on'):t('off')],
        ]
      }
      const proposeRestore = () => {
        if(!restoreReview)return null
        const incoming=restoreReview.incoming
        const permissions=restorePermissions&&restoreReview.permissions
          ? restoreReview.permissions : {policies:privatePolicies(),allowPersonalInformation:false,allowCloud:false}
        const proposal={...incoming,preferences:withoutCustomConsent(incoming.preferences),policies:{...permissions.policies},
          allowPersonalInformation:permissions.allowPersonalInformation,allowCloud:permissions.allowCloud}
        if(restoreStrategy==='replace-merge')proposal.preferences={...withoutCustomConsent(incoming.preferences),custom:mergedText}
        return proposal
      }
      const startReview = text => {
        clearRestore()
        try {
          if(!text)throw profileError('invalidContent')
          if(text.length>PROFILE_MAX_CHARS)throw profileError('tooLarge')
          let parsed
          try{parsed=JSON.parse(text)}catch{throw profileError('invalidJson')}
          const decoded=decodeAnyProfile(parsed)
          const review=decoded.legacy
            ? {source:'legacy',incoming:migrateLegacyProfile(decoded.legacy),permissions:null,
              legacyWorkspaces:decoded.legacy.workspaces.map(w=>w.id)}
            : {source:'current',incoming:decoded.record,legacyWorkspaces:[],
              permissions:{policies:decoded.record.policies,allowPersonalInformation:decoded.record.allowPersonalInformation,allowCloud:decoded.record.allowCloud}}
          setRestoreReview(review)
          setMergedText(mergeInstructions(record.preferences.custom,review.incoming.preferences.custom))
          setBackupMessage('reviewReady')
        // Never clear a conflict/failed state: those require a reload before Save.
        }catch(error){
          setBackupMessage(error?.code==='tooLarge'?'fileTooLarge':(error?.code||'invalidContent'))
          setStatus(s=>s==='conflict'||s==='failed'?s:'invalid')
        }
      }
      const importFile = async e => {
        const target=e.currentTarget, file=target.files?.[0], win=target.ownerDocument?.defaultView
        clearRestore()
        if(!file)return
        if(!(file.size<=PROFILE_MAX_CHARS)){target.value='';setBackupMessage('fileTooLarge');setStatus(s=>s==='conflict'||s==='failed'?s:'invalid');return}
        let text
        try{text=await readFileText(file,win)}catch{target.value='';setBackupMessage('fileReadFailed');return}
        target.value=''
        setRestoreText(text);startReview(text)
      }
      let contents
      if (page === 'information') {
        contents = card(t('information'),
          h('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(210px,1fr))',gap:'0 18px'}},
            ...PERSONAL_FIELDS.map(id=>id==='gender'
              ? dropdown(id,t(id),values.gender,GENDER_VALUES.map(v=>[v,genderLabel(v)]),v=>setField(id,v))
              : input(id,t(id),values[id],v=>setField(id,v)))))
      } else if (page === 'instructions') {
        const setPreference = (key,value) => setPreferences(old=>key==='custom'?{...withoutCustomConsent(old),custom:value}:({...old,[key]:value}))
        const activePreview = previewProfilePreferences(preferences)
        contents = h(React.Fragment,null,
          card(t('unified'),h('p',{style:muted},t('unifiedHint'))),
          card(t('personality'),
            dropdown('style',t('styleTone'),preferences.style,
              PROFILE_STYLES.map(item=>[item[0],localLabel(item)]),v=>setPreference('style',v)),
            h('p',{style:muted},t('preferenceHint'))),
          card(t('responseLanguage'),
            dropdown('response-language',t('responseLanguage'),preferences.responseLanguage,
              PROFILE_LANGUAGES.map(item=>[item[0],localLabel(item)]),v=>setPreference('responseLanguage',v)),
            h('p',{style:muted},t('languageHint'))),
          card(t('characteristics'),
            ...PROFILE_TRAITS.map(item=>{
              const [key]=item
              const level=preferences.traits[key]
              const levelText=t(['less','neutral','more'][level])
              const change=e=>{
                const value=Number(e.currentTarget.value)
                if([0,1,2].includes(value)) setPreferences(old=>({...old,traits:{...old.traits,[key]:value}}))
              }
              return h('div',{key,style:{marginBottom:17}},
                h('div',{style:{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12}},
                  h('label',{htmlFor:'pp-trait-'+key,style:label},localLabel(item)),
                  h('output',{'aria-live':'polite',htmlFor:'pp-trait-'+key},levelText)),
                h('input',{id:'pp-trait-'+key,type:'range',min:0,max:2,step:1,
                  value:level,'aria-valuetext':levelText,style:{width:'100%',accentColor:'auto'},
                  onInput:change,onChange:change}),
                h('div',{style:{display:'flex',justifyContent:'space-between',fontSize:11,opacity:.75}},
                  h('span',null,t('less')),h('span',null,t('neutral')),h('span',null,t('more'))))
            })),
          card(t('presets'),
            h('p',{style:muted},t('presetHint')),
            ...PROFILE_PRESETS.map(item=>h('label',{key:item[0],htmlFor:'pp-preset-'+item[0],
              style:{display:'flex',alignItems:'start',gap:10,margin:'12px 0',cursor:'pointer'}},
              h('input',{id:'pp-preset-'+item[0],type:'checkbox',checked:preferences.presets.includes(item[0]),
                onChange:e=>{const checked=e.target.checked;setPreferences(old=>({...old,
                  presets:checked?[...new Set([...old.presets,item[0]])]:old.presets.filter(id=>id!==item[0])}))}}),
              h('span',null,h('strong',null,localLabel(item)),
                h('span',{style:{display:'block',fontSize:12,opacity:.76}},rtl?item[3]:item[4]))))),
          card(t('customInstructions'),
            h('label',{htmlFor:'pp-custom',style:label},t('customInstructions')),
            h('textarea',{id:'pp-custom',rows:6,maxLength:PROFILE_CUSTOM_MAX,style:control,'aria-describedby':'pp-custom-count',
              value:preferences.custom,onChange:e=>setPreference('custom',e.target.value),dir:'auto'}),
            h('p',{id:'pp-custom-count',style:{...muted,marginTop:6}},preferences.custom.length+' / '+PROFILE_CUSTOM_MAX+' '+t('characters')),
            checkbox('send-custom',preferences.sendCustom===true,v=>setPreferences(old=>v?{...old,sendCustom:true}:withoutCustomConsent(old)),t('sendCustom'),{disabled:!preferences.custom.trim()}),
            h('p',{style:muted},t('customConsentHint')),
            h('button',{type:'button',id:'pp-reset-preferences',style:{...btn,marginTop:12},
              onClick:()=>setPreferences(()=>neutralProfilePreferences())},t('resetPreferences'))),
          card(t('effective'),h('p',{style:muted},t('previewHint')),
            h('output',{id:'pp-effective-instructions',dir:'auto',
              style:{display:'block',whiteSpace:'pre-wrap',overflowWrap:'anywhere'}},activePreview||t('noInstruction'))))
      } else if (page === 'access') {
        contents = card(t('access'),h('p',null,t('accessHint')),
          checkbox('opt-in',record.allowPersonalInformation,v=>setRecord(old=>({...old,allowPersonalInformation:v})),t('optIn')),
          checkbox('cloud',record.allowCloud,v=>setRecord(old=>({...old,allowCloud:v})),t('cloud')),
          h('h3',{style:{fontSize:15}},t('fieldPolicies')),
          h('p',{style:muted},t('policiesHint')),
          ...PERSONAL_FIELDS.map(id=>dropdown('policy-'+id,t(id),record.policies[id],
            POLICY_VALUES.map(v=>[v,policyLabel(v)]),
            v=>setRecord(old=>({...old,policies:{...old.policies,[id]:v}})))))
      } else if(page==='backup') {
        const proposal=proposeRestore()
        const mergeTooLong=!!restoreReview&&restoreStrategy==='replace-merge'&&mergedText.length>PROFILE_CUSTOM_MAX
        let proposalValid=false
        try{proposalValid=!!proposal&&!mergeTooLong&&!!decodeProfile(proposal)}catch{proposalValid=false}
        const canApply=proposalValid&&restoreAck&&(!restorePermissions||permissionsAck)
        const strategyOption=(value,title,hint)=>h('div',{key:value,style:check},
          h('input',{id:'pp-strategy-'+value,type:'radio',name:'pp-strategy',value,checked:restoreStrategy===value,
            style:{marginTop:5},'aria-describedby':'pp-strategy-'+value+'-hint',
            onChange:()=>{setRestoreStrategy(value);setRestoreAck(false)}}),
          h('div',null,h('label',{htmlFor:'pp-strategy-'+value,style:{fontWeight:650}},title),
            h('p',{id:'pp-strategy-'+value+'-hint',style:{...muted,marginTop:2}},hint)))
        const currentRows=summarize(record)
        const reviewCard = restoreReview ? card(t('previewTitle'),
          h('table',{id:'pp-restore-preview',style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
            h('caption',{style:{textAlign:'start',fontWeight:650,marginBottom:6}},t('previewTitle')),
            h('thead',null,h('tr',null,
              h('th',{scope:'col',style:cell},t('setting')),h('th',{scope:'col',style:cell},t('current')),h('th',{scope:'col',style:cell},t('proposed')))),
            h('tbody',null,...summarize(proposal).map(([key,title,value],index)=>h('tr',{key,'data-restore-row':key},
              h('th',{scope:'row',style:{...cell,fontWeight:600}},title),
              h('td',{style:cell,dir:'auto'},currentRows[index][2]),
              h('td',{style:{...cell,fontWeight:currentRows[index][2]===value?400:700},dir:'auto'},value))))),
          restoreReview.legacyWorkspaces.length ? h('div',{role:'note',style:{marginTop:12}},
            h('p',{style:{margin:'0 0 6px'}},t('legacyEntries')),
            h('ul',{id:'pp-restore-legacy',dir:'ltr',style:{margin:0}},...restoreReview.legacyWorkspaces.map(id=>h('li',{key:id},id)))) : null,
          restoreStrategy==='replace-merge' ? h('div',{style:{marginTop:14}},
            h('label',{htmlFor:'pp-restore-merged',style:label},t('mergedLabel')),
            h('textarea',{id:'pp-restore-merged',rows:8,dir:'auto',style:control,value:mergedText,'aria-describedby':'pp-restore-merged-count',
              'aria-invalid':mergeTooLong,onChange:e=>{setMergedText(e.target.value);setRestoreAck(false)}}),
            h('p',{id:'pp-restore-merged-count',role:mergeTooLong?'alert':undefined,style:{...muted,marginTop:6,fontWeight:mergeTooLong?700:400}},
              mergedText.length+' / '+PROFILE_CUSTOM_MAX+' '+t('characters')+(mergeTooLong?' — '+t('mergeTooLong'):''))) :
            h('div',{style:{marginTop:14}},
              h('label',{htmlFor:'pp-restore-imported',style:label},t('importedInstructions')),
              h('textarea',{id:'pp-restore-imported',readOnly:true,rows:5,dir:'auto',style:control,value:restoreReview.incoming.preferences.custom})),
          h('h3',{style:{fontSize:15,marginTop:18}},t('permissionsTitle')),
          restoreReview.permissions ? h(React.Fragment,null,
            h('p',{style:muted},t('permissionsDefault')),
            checkbox('restore-permissions',restorePermissions,v=>{setRestorePermissions(v);setPermissionsAck(false);setRestoreAck(false)},t('restorePermissions')),
            restorePermissions ? h('div',{style:{padding:'10px 14px',border:'1px solid rgba(208,58,52,.5)',borderRadius:10}},
              h('ul',{id:'pp-restore-permission-list',style:{margin:'0 0 8px'}},
                ...PERSONAL_FIELDS.map(key=>h('li',{key},t(key)+': '+policyLabel(restoreReview.permissions.policies[key]))),
                h('li',null,t('optIn')+': '+(restoreReview.permissions.allowPersonalInformation?t('on'):t('off'))),
                h('li',null,t('cloud')+': '+(restoreReview.permissions.allowCloud?t('on'):t('off')))),
              checkbox('restore-permissions-ack',permissionsAck,v=>{setPermissionsAck(v);setRestoreAck(false)},t('permissionsAck'))) : null)
            : h('p',{style:muted},t('permissionsLegacy')),
          checkbox('restore-confirm',restoreAck,setRestoreAck,t('confirm'),{disabled:!proposalValid}),
          h('div',{style:row},
            h('button',{id:'pp-restore-apply',type:'button',style:btn,disabled:!canApply,onClick:()=>{
              const next=proposeRestore()
              try{setRecord(decodeProfile(next))}catch{setBackupMessage('invalidContent');return}
              setRestoreText('');clearRestore();setExportView(false);setBackupMessage('restoreApplied')
            }},t('applyRestore')),
            h('button',{id:'pp-restore-cancel',type:'button',style:btn,onClick:()=>{clearRestore();setBackupMessage('')}},t('cancelRestore')))) : null
        contents=h(React.Fragment,null,
          card(t('exportTitle'),h('p',{role:'note'},t('exportHint')),
            jsonActions('export',exportText,backupFileName(false),exportView,setExportView),
            exportView?jsonView('export-json',exportText(),t('exportJson')):null),
          card(t('importTitle'),h('p',null,t('importHint')),
            h('label',{htmlFor:'pp-import-file',style:label},t('importFile')),
            h('input',{id:'pp-import-file',type:'file',accept:'application/json,.json',style:{...control,padding:'7px 9px'},onChange:e=>{void importFile(e)}}),
            h('label',{htmlFor:'pp-restore-json',style:{...label,marginTop:14}},t('pasteJson')),
            h('textarea',{id:'pp-restore-json',rows:6,maxLength:PROFILE_MAX_CHARS,dir:'ltr',lang:'en',spellCheck:false,style:jsonControl,value:restoreText,
              onChange:e=>{setRestoreText(e.target.value);clearRestore()}}),
            h('fieldset',{style:{border:0,padding:0,margin:'14px 0 0',minWidth:0}},
              h('legend',{style:{...label,padding:0}},t('strategy')),
              strategyOption('replace',t('replaceAll'),t('replaceAllHint')),
              strategyOption('replace-merge',t('replaceMerge'),t('replaceMergeHint'))),
            h('button',{id:'pp-restore-review',type:'button',style:btn,onClick:()=>startReview(restoreText)},t('import'))),
          reviewCard)
      }else {
        contents=card(t('privacy'),h('p',null,t('warning')),h('p',null,t('accessHint')),h('p',null,t('exportHint')))
      }
      const migrationCard = legacy ? h('section',{id:'pp-migration',style:{...surface,border:'1px solid rgba(208,158,52,.75)'},'aria-label':t('migrationTitle')},
        h('h2',{style:{fontSize:17,margin:'0 0 10px'}},t('migrationTitle')),
        h('p',null,t('migrationHint')),
        legacy.workspaces.length ? h(React.Fragment,null,
          h('p',null,t('migrationDiscard')),
          h('div',{style:{overflowX:'auto'}},h('table',{id:'pp-migration-workspaces',style:{width:'100%',borderCollapse:'collapse',fontSize:13}},
            h('caption',{style:{textAlign:'start',fontWeight:650,marginBottom:6}},t('migrationDiscard')),
            h('thead',null,h('tr',null,...[t('workspaceId'),t('overrideCol'),t('styleTone'),t('responseLanguage'),t('customInstructions'),t('policiesCol')]
              .map(x=>h('th',{key:x,scope:'col',style:cell},x)))),
            h('tbody',null,...legacy.workspaces.map(w=>h('tr',{key:w.id},
              h('th',{scope:'row',dir:'ltr',style:{...cell,fontWeight:600}},w.id),
              h('td',{style:cell},w.override?t('yes'):t('no')),
              h('td',{style:cell},localLabel(PROFILE_STYLES.find(i=>i[0]===w.preferences.style))),
              h('td',{style:cell},localLabel(PROFILE_LANGUAGES.find(i=>i[0]===w.preferences.responseLanguage))),
              h('td',{style:cell},w.preferences.custom.length+' '+t('characters')),
              h('td',{style:cell},PERSONAL_FIELDS.map(key=>t(key)+': '+policyLabel(w.policies[key])).join(rtl?'، ':', '))))))))
          : h('p',null,t('migrationKept')),
        legacy.allowPersonalInformation||legacy.allowCloud ? h('p',{role:'note',style:{fontWeight:600}},t('migrationMasters')) : null,
        h('p',{style:muted},t('exportHint')),
        jsonActions('legacy',legacyText,backupFileName(true),legacyView,setLegacyView),
        legacyView?jsonView('legacy-json',legacyText(),t('legacyJson')):null,
        legacyDiscards(legacy) ? checkbox('migration-ack',migrationAck,setMigrationAck,t('migrationAck'),{disabled:!editable}) : null,
        page!=='backup'?backupStatus:null) : null
      return h('div',{'data-personal-profile-panel':'native-settings',lang:language,
        dir:rtl?'rtl':'ltr',style:{height:'100%',overflowY:'auto',boxSizing:'border-box',
          padding:'max(var(--dsh-frame-top-clearance, 0px), 28px) clamp(18px,4vw,56px) 52px',
          color:'inherit',lineHeight:1.6}},
        h('div',{style:{maxWidth:1050,margin:'0 auto'}},
          h('header',{style:{display:'flex',flexWrap:'wrap',gap:12,
            alignItems:'center',justifyContent:'space-between'}},
            h('div',null,h('h1',{style:{margin:'0 0 4px',fontSize:'clamp(22px,3vw,32px)'}},t('title')),
              h('p',{style:{margin:'0 0 12px',opacity:.7}},t('subtitle'))),
            h('fieldset',{disabled:!editable,style:{width:145,border:0,padding:0,margin:0}},dropdown('language',t('language'),language,
              [['ar','العربية'],['en','English']],setLanguage))),
          notice,
          h('div',{style:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:12}},
            h('button',{id:'pp-save',type:'button',style:btn,disabled:!editable||!dirty||status==='conflict'||status==='failed'||migrationBlocked,onClick:save},t('save')),
            h('button',{id:'pp-reload',type:'button',style:btn,disabled:busy||!canRead,onClick:requestReload},t('reload')),
            h('button',{id:'pp-reset',type:'button',style:btn,disabled:!editable,onClick:()=>{setRecord({...emptyProfileRecord(),locale:language});setRestoreText('');clearRestore();setExportView(false)}},t('reset'))),
          h('p',{id:'pp-save-status',role:'status'},t(status)+(dirty&&status!=='migration'?' '+t('dirty'):'')),
          confirmReload?h('div',{id:'pp-reload-prompt',role:'alert',style:{padding:'12px 15px',marginBottom:12,
            border:'1px solid rgba(208,58,52,.6)',borderRadius:10,background:'rgba(208,58,52,.08)'}},
            h('p',{style:{margin:'0 0 10px'}},t('discardWarning')),
            h('div',{style:{display:'flex',gap:10,flexWrap:'wrap'}},
              h('button',{id:'pp-reload-confirm',type:'button',style:btn,disabled:busy||!canRead,onClick:()=>{void load()}},t('discardConfirm')),
              h('button',{id:'pp-reload-cancel',type:'button',style:btn,onClick:()=>setConfirmReload(false)},t('discardCancel')))):null,
          migrationCard,
          h('fieldset',{disabled:!editable,style:{border:0,margin:0,padding:0,minWidth:0}},
          h('nav',{role:'tablist','aria-label':t('title'),
            style:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:20}},
            ...sections.map(id=>h('button',{key:id,type:'button',role:'tab',
              id:'pp-tab-'+id,'aria-selected':page===id,
              'aria-controls':'pp-content',onClick:()=>setPage(id),
              style:{...btn,background:page===id?'rgba(128,128,128,.22)':'transparent',
                fontWeight:page===id?700:500}},t(id)))),
          h('div',{role:'tabpanel',id:'pp-content','aria-labelledby':'pp-tab-'+page},
            page==='backup'?backupStatus:null,contents))))
    }

    // Contains a Personal Profile render failure inside the page. Without it the
    // Host Slot boundary retires the `main` entry and the content area is blank.
    const ProfileErrorBoundary=typeof React.Component==='function'?class extends React.Component{
      constructor(props){super(props);this.state={failed:false}}
      // No logging: profile code never writes to the console (privacy policy).
      static getDerivedStateFromError(){return {failed:true}}
      render(){
        if(!this.state.failed)return this.props.children
        return h('div',{'data-personal-profile-error':'',role:'alert',style:{padding:'max(var(--dsh-frame-top-clearance, 0px), 28px) clamp(18px,4vw,56px)',lineHeight:1.6}},
          h('h1',{style:{fontSize:22,margin:'0 0 8px'}},'Personal Profile — الملف الشخصي'),
          h('p',{dir:'rtl',lang:'ar'},'تعذر عرض صفحة الملف الشخصي. لم يتم حفظ أو تغيير أي إعداد.'),
          h('p',{lang:'en'},'Personal Profile could not be displayed. No settings were saved or changed.'),
          h('button',{type:'button',onClick:()=>this.setState({failed:false}),style:{border:'1px solid rgba(128,128,128,.35)',borderRadius:8,padding:'9px 13px',font:'inherit',background:'rgba(128,128,128,.08)',color:'inherit',cursor:'pointer'}},'Retry — إعادة المحاولة'))
      }
    }:null

    function ProfileDraft() {
      return h('section',{'data-personal-profile-draft':'',style:{borderTop:border,padding:'20px 0'}},
        h('h3',null,'Personal Profile — local settings'),
        h('p',null,'One unified profile: Preferred name, Nationality, Gender, response preferences and optional Custom Instructions. All access is Private by default.'),
        h('p',null,'Saved in the active Harness Profile without plugin-level encryption. Open Personal Profile to edit. Saved response preferences are contributed to supported native agent steps; structured personal information disclosure is not implemented.'))
    }
    const PROFILE_MODULE = TYPE + '/personal-profile'
    /** The Host's own enablement of the Profile row on the subject page; false when it says Off. */
    function profileRowEnabled(subject) {
      if (subject?.kind === 'row') return subject.row?.moduleName === PROFILE_MODULE && subject.row.enabled === true
      const row = Array.isArray(subject?.pkg?.rows)
        ? subject.pkg.rows.find(item => item?.moduleName === PROFILE_MODULE) : undefined
      return row === undefined ? true : row.enabled === true
    }
    // Every Personal Profile surface lives in this child fiber, which the
    // suite starts only while the Host row is enabled and active, and disposes
    // (unregistering each Slot entry) as soon as the row is switched Off.
    // No agent capabilities; all writes go through the native settings service.
    const profilePlugin = {
      // 0.7.2: no Workspace service. The profile is unified and never reads
      // Workspace membership, so `workspaces` is deliberately not injected.
      inject: ['slots','remote','remote.settings'],
      apply(ctx) {
        const listeners=new Set()
        let generation=0
        const connectionSource={getSnapshot:()=>generation,subscribe:fn=>{listeners.add(fn);return()=>listeners.delete(fn)}}
        ctx.on('connection/reset',()=>{generation++;for(const fn of [...listeners])fn()})
        const settings=ctx.remote.settings
        function ProfileSlot(props) {
          const page=h(PersonalProfilePage,{settings,connectionSource,useRemoteAccess:props?.useRemoteAccess})
          return ProfileErrorBoundary?h(ProfileErrorBoundary,null,page):page
        }
        ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main', key: PROFILE_PANEL_ID,
        }, ProfileSlot))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist', id: PROFILE_PANEL_ID, order: 40,
          label: () => 'Personal Profile',
        }, ProfilePanelIcon))
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
          name: 'plugins.detail.section', id: 'abinadwan-profile-draft', order: 40,
        }, ({ subject }) => ((subject?.kind === 'bundle' && subject.pkg?.name === TYPE) ||
          (subject?.kind === 'row' && subject.row?.moduleName === PROFILE_MODULE)) && profileRowEnabled(subject)
          ? h(ProfileDraft) : null))
      },
    }
    // Root-owned locale registration is independent of the three Host Components.
    // Requiring only the official locale service keeps a missing service from
    // disabling Environment & Context or the other suite capabilities.
    const arabicLocalePlugin = {
      inject: ['locale'],
      apply(ctx) {
        ctx.effect(() => {
          const locale = ctx.locale
          if (typeof locale?.addLanguage !== 'function' || typeof locale?.register !== 'function') {
            console.warn('[abinadwan-suite] Arabic UI locale requires the official DSH locale catalog API')
            return
          }
          const disposers = []
          const occupied = error => /occupied|already/i.test(String(error?.message || error))
          try {
            // Do not call setLocale: this only makes Arabic an available option.
            try {
              const dispose = locale.addLanguage({ id: 'ar', label: 'العربية', fallback: 'en' })
              if (typeof dispose === 'function') disposers.push(dispose)
            } catch (error) {
              if (!occupied(error)) throw error
            }
            for (const [namespace, dictionary] of Object.entries(ARABIC_UI_DICTIONARIES)) {
              try {
                const dispose = locale.register(namespace, 'ar', dictionary)
                if (typeof dispose === 'function') disposers.push(dispose)
              } catch (error) {
                // Other installed Arabic packs may already own a namespace.
                if (!occupied(error)) throw error
              }
            }
          } catch (error) {
            for (const dispose of disposers.reverse()) {
              try { dispose() } catch (cleanupError) { console.warn('[abinadwan-suite] Arabic locale cleanup failed', cleanupError) }
            }
            throw error
          }
          return () => {
            // Unregister dictionaries before the language itself on suite unload.
            for (const dispose of disposers.reverse()) {
              try { dispose() } catch (error) { console.warn('[abinadwan-suite] Arabic locale cleanup failed', error) }
            }
          }
        }, 'suite: Arabic UI language registration')
      },
    }
    return {
      // `remote.pluginManager` is its own Cordis service (one per Remote
      // namespace). It must be injected here: Cordis 4 throws "cannot get
      // property without inject" when an un-injected namespace is read.
      inject: ['slots', 'remote', 'remote.pluginManager', 'remoteAccess'],
      apply(ctx) {
        // This runs with the bundle's browser carrier, not with a toggleable Component.
        ctx.effect(() => {
          const fiber = ctx.plugin(arabicLocalePlugin)
          return () => fiber.dispose()
        }, 'suite: bundled Arabic locale')
        const pluginManager = ctx.remote.pluginManager
        // The suite browser lifetime owns the opt-in-free read-only version
        // check. A timer cannot install, enable or modify any plugin.
        ctx.effect(() => {
          versionDisposed = false
          versionGeneration++
          nextAllowedCheck = 0
          inflightCheck = null
          void checkRelease()
          const timer = setInterval(() => { void checkRelease() }, CHECK_INTERVAL)
          return () => {
            clearInterval(timer)
            versionGeneration++
            versionDisposed = true
            inflightCheck = null
            versionListeners.clear()
          }
        }, 'suite: automatic stable-release check')
        // The official Plugins detail page owns update controls; never render them inside a Session tab.
        // `useRemoteAccess` is the root-scope standard hook every Slot entry receives.
        function VersionSlot({ subject, useRemoteAccess }) {
          if (subject?.kind !== 'bundle' || subject.pkg?.name !== TYPE) return null
          return h(VersionUpdates, { installedVersion: subject.pkg.version, pluginManager, useRemoteAccess })
        }
        ctx.slots.inject('plugins.detail.section', () => ctx.slots.register({
          name: 'plugins.detail.section',
          id: 'environment-sidebar-versions',
          order: 50,
        }, VersionSlot))

        // DSH discovers browser bundles at package roots. Host subpath rows
        // govern these child fibers through the public, access-checked inventory.
        ctx.remoteAccess.whenAccess('pluginManager/listPlugins', () => {
          const fibers = new Map()
          let stopped = false
          let generation = 0
          let pending = Promise.resolve()
          const components = [
            [TYPE + '/environment-context', environmentPlugin],
            [TYPE + '/personal-profile', profilePlugin],
          ]
          async function refresh() {
            const request = ++generation
            let rows
            try {
              rows = remoteValue(await pluginManager.listPlugins(), 'Plugin inventory')
              if (!Array.isArray(rows)) throw new Error('Invalid plugin inventory')
            } catch (error) {
              rows = []
              if (!stopped && request === generation) {
                console.warn('[abinadwan-suite] Component inventory unavailable. UI paused until the next inventory refresh.',
                  String(error?.message || error))
              }
            }
            pending = pending.then(async () => {
              if (stopped || request !== generation) return
              for (const [moduleName, plugin] of components) {
                const active = rows.some(row => row.moduleName === moduleName &&
                  row.enabled === true && row.fiberPhase === 'active')
                const fiber = fibers.get(moduleName)
                if (!active && fiber) {
                  fibers.delete(moduleName)
                  await fiber.dispose()
                }
                if (stopped || request !== generation) return
                if (active && !fiber) fibers.set(moduleName, ctx.plugin(plugin))
              }
            }).catch(error => {
              console.warn('[abinadwan-suite] Component UI transition failed:', error)
            })
            await pending
          }
          const unsubscribe = ctx.remote.$on('plugin-manager/changed', refresh)
          const disconnectReset = ctx.on('connection/reset', refresh)
          void refresh()
          return () => {
            stopped = true
            generation++
            unsubscribe()
            disconnectReset()
            const disposals = [...fibers.values()].map(fiber => fiber.dispose())
            fibers.clear()
            return Promise.all(disposals).then(() => {})
          }
        })
      },
    }
  },
})
