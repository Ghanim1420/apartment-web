# نظام إدارة عمارة سكنية

## 1. إعداد قاعدة البيانات
افتح مشروع Supabase > SQL Editor > New query، الصق محتوى ملف `supabase_schema.sql` واضغط Run.

## 2. الإعداد المحلي (اختياري للتجربة)
```
npm install
cp .env.example .env
npm run dev
```

## 3. الرفع على GitHub
```
git init
git add .
git commit -m "apartment dashboard"
git branch -M main
git remote add origin <رابط المستودع من GitHub>
git push -u origin main
```

## 4. النشر على Vercel
1. سجّل دخول على vercel.com بحساب GitHub.
2. Add New > Project > اختر المستودع.
3. في Environment Variables أضف:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. اضغط Deploy.

## 5. ربط الدومين
من إعدادات المشروع في Vercel > Domains > أضف الدومين واتبع تعليمات DNS.
