# Environment Sidebar for DeepSeek Harness

لوحة مستقلة **بيئة وسياق** في الشريط الجانبي الأيسر لتطبيق DeepSeek Harness، تتضمن ثلاث تبويبات: **بيئة التشغيل** و**السياق** و**المخرجات والنشاط**.

> **الحالة:** نسخة أولى تجريبية 0.1.0. فُحصت بنيتها ووحدة تحميلها آليًا، لكن يجب اختبارها داخل إصدار DeepSeek Harness المثبت على جهاز المستخدم. هذه الإضافة ليست جزءًا من المشروع الرسمي.

## ما الذي تعرضه؟

- **Environment:** منصة المتصفح ولغته والمنطقة الزمنية وحالة الاتصال، بالإضافة إلى أصل عنوان واجهة التطبيق فقط (دون query params).
- **Context:** عدد مساحات العمل والجلسات والحالات الجارية والمؤرشفة والمثبتة. تُقرأ من `sessions.list` و`workspaces.list` الرسميين.
- **Outputs:** آخر نشاط موثّق للجلسات (العنوان والتاريخ وحالة التشغيل). **لا تقرأ الإضافة نصوص ردود الوكيل أو محتويات الأدوات**؛ فهذا يتطلب API إضافية موثقة.

لا تشغّل أوامر محلية، ولا تقرأ متغيرات البيئة السرية، ولا تطلب رموز دخول، ولا تتصل بخوادم أخرى.

## التثبيت من GitHub

نفّذ في PowerShell على الجهاز الذي يعمل عليه DSH:

```powershell
dsh plugin --profile desktop add github:abinadwan/deepseek-harness-environment-sidebar
dsh --profile desktop --dump-config
```

ثم أعد تشغيل تطبيق DeepSeek Harness (بالـProfile نفسه). ابحث عن **بيئة وسياق** في الشريط الجانبي الأيسر.

**إذا كانت الإضافة القديمة** `@yourname/environment-sidebar` مثبتة، عطّلها أو أزلها من Plugins أولًا لتجنب تكرار اللوحات.

للتثبيت بإصدار ثابت لأسباب أمنية استخدم commit SHA بدل رأس الفرع:

```powershell
dsh plugin --profile desktop add github:abinadwan/deepseek-harness-environment-sidebar#<COMMIT_SHA>
```

يمكن أيضًا تنزيل المستودع ثم تثبيته كمسار محلي عبر `dsh plugin --profile desktop add .\deepseek-harness-environment-sidebar`، بشرط تنفيذ الأمر من المجلد الأب.

هذه النسخة تحتوي على ملفي `index.js` و`client.js` الجاهزين، **ولا تحتاج** `npm run build` أو `prepare` أو صلاحية لتشغيل سكربت أثناء تثبيت GitHub.

## فحص محلي

```powershell
npm test
```

اختبارات Node لا تحل محل اختبار التشغيل داخل واجهة Desktop. عند حدوث مشكلة تحقق من أن حزمة `@abinadwan/environment-sidebar` في وضع Running، ومن رسائل Browser Console، ثم طابق إصدار Harness مع [التوثيق الرسمي](https://github.com/deepseek-ai/deepseek-harness).

## بنية الحزمة

- `package.json`: تعريف `dsh.bundle` و`dsh.client` و`./client`
- `cordis.patch.yml`: يضيف صف التحميل إلى Profile
- `index.js`: مدخل Host آمن بدون إجراءات إضافية
- `client.js`: Client Bundle بنظام lazy-CJS، يسجل `main` و`sidebar.panellist`
- `test/plugin.test.js`: اختبارات Manifest والتسجيل والقيود الأمنية

## المصادر والحقوق

هذا تنفيذ مستقل يستعمل البروتوكولات الموثقة في المصدر الرسمي لـ DeepSeek Harness:

- [Package and install a plugin](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/develop/basic/publish.md)
- [Official decoration plugin template](https://github.com/deepseek-ai/deepseek-harness/tree/master/packages/preset/agent-preset/skills/dsh-doc/templates/decoration)
- [ui-sidebar slot contract](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-sidebar/README.md)

DeepSeek Harness مشروع مستقل، وتظل أسماء علاماته ورخصه وملفاته بحقوق أصحابها. لا يُفترض أن هذه الإضافة معتمدة رسميًا من DeepSeek. لم تُنسخ ملفات مصدر رسمية إلى هذا المستودع. لم يُضف ترخيص عام إلى هذا المستودع الخاص دون قرار من مالكه.
