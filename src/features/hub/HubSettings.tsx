import { useRef, useState } from 'react';
import { Download, RotateCcw, Upload, Info } from 'lucide-react';
import { HubHeader } from './HubRoutes';
import { data } from '@/data';
import { errorMessage } from '@/data/errors';
import { downloadFile } from '@/domain/misc';
import { BRAND } from '@/config/brand';
import { Button, Card } from '@/ui/primitives';
import { Confirm } from '@/ui/Sheet';
import { toast } from '@/ui/Toast';

export default function HubSettings() {
  const [confirm, setConfirm] = useState<'reset' | 'import' | null>(null);
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<unknown>(null);

  return (
    <div className="mx-auto max-w-3xl">
      <HubHeader title="تنظیمات" />
      <div className="flex flex-col gap-4 px-5 lg:px-10">
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <RotateCcw />
          <div className="min-w-0 flex-1">
            <div className="font-bold">بازنشانی داده‌های دمو</div>
            <div className="text-sm text-muted">۷ کسب‌وکار نمونه با نوبت‌های تازه دوباره ساخته می‌شوند. کسب‌وکارهای واقعی دست نمی‌خورند.</div>
          </div>
          <Button variant="danger" onClick={() => setConfirm('reset')}>
            بازنشانی
          </Button>
        </Card>
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <Download />
          <div className="min-w-0 flex-1">
            <div className="font-bold">پشتیبان‌گیری (JSON)</div>
            <div className="text-sm text-muted">همه داده‌ها به‌جز تصاویر. برای انتقال به سرور واقعی هم از همین فایل استفاده می‌شود.</div>
          </div>
          <Button
            onClick={async () => {
              const b = await data.admin.exportAll();
              downloadFile(`nubo-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(b), 'application/json');
            }}
          >
            دانلود
          </Button>
        </Card>
        <Card className="flex flex-wrap items-center gap-4 p-5">
          <Upload />
          <div className="min-w-0 flex-1">
            <div className="font-bold">بازگردانی از پشتیبان</div>
            <div className="text-sm text-muted">داده‌های فعلی این مرورگر با فایل جایگزین می‌شود.</div>
          </div>
          <Button onClick={() => file.current?.click()}>انتخاب فایل</Button>
          <input
            ref={file}
            type="file"
            accept="application/json"
            hidden
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setPending(JSON.parse(await f.text()));
                setConfirm('import');
              } catch {
                toast('فایل معتبر نیست', 'error');
              }
            }}
          />
        </Card>
        <Card className="flex items-start gap-3 p-5 text-sm leading-7 text-muted">
          <Info size={18} className="mt-1 shrink-0" />
          <span>
            این نسخه نمایشی است و داده‌ها فقط در همین مرورگر ذخیره می‌شوند. برای استفاده واقعی (هماهنگی بین گوشی مشتری و منشی) سرور اختصاصی لازم است. ساخته‌شده توسط{' '}
            <span dir="ltr" className="font-semibold text-ink">
              {BRAND.studio}
            </span>
            .
          </span>
        </Card>
      </div>
      <Confirm
        open={confirm !== null}
        onClose={() => setConfirm(null)}
        title={confirm === 'reset' ? 'بازنشانی دمو؟' : 'جایگزینی همه داده‌ها؟'}
        text={confirm === 'reset' ? 'همه تغییرات کسب‌وکارهای نمونه از بین می‌رود.' : 'همه داده‌های فعلی این مرورگر با فایل پشتیبان جایگزین می‌شود.'}
        danger
        loading={busy}
        confirmLabel={confirm === 'reset' ? 'بازنشانی' : 'جایگزینی'}
        onConfirm={async () => {
          setBusy(true);
          try {
            if (confirm === 'reset') await data.admin.resetDemo();
            else await data.admin.importAll(pending as never);
            toast('انجام شد');
          } catch (e) {
            toast(errorMessage(e), 'error');
          } finally {
            setBusy(false);
            setConfirm(null);
          }
        }}
      />
    </div>
  );
}
