import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Copy, Download, ExternalLink, Camera as Instagram, MessageCircle, Printer, Send } from 'lucide-react';
import { useDash } from './context';
import { Page, PageHeader } from './Layout';
import { usePalette } from '@/theme/ThemeScope';
import { BRAND } from '@/config/brand';
import { Button, Card } from '@/ui/primitives';
import { toast } from '@/ui/Toast';

export default function Share() {
  const { tenant } = useDash();
  const palette = usePalette();
  const url = `${location.origin}${import.meta.env.BASE_URL}b/${tenant.slug}`;
  const [qr, setQr] = useState('');

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 1, width: 640, color: { dark: '#141414', light: '#00000000' }, errorCorrectionLevel: 'M' }).then(setQr);
  }, [url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast('لینک کپی شد');
    } catch {
      toast(url, 'info');
    }
  };

  /** A print-ready counter card (A6 ratio) drawn on canvas: name, QR, call to action. */
  const downloadCard = async () => {
    await document.fonts.ready;
    const W = 1240;
    const H = 1748;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.fillStyle = '#FFFFFF';
    g.fillRect(0, 0, W, H);
    g.fillStyle = palette.accent;
    g.fillRect(0, 0, W, 22);
    g.direction = 'rtl';
    g.textAlign = 'center';
    g.fillStyle = '#141414';
    g.font = '800 92px "Vazirmatn Variable", Vazirmatn, sans-serif';
    g.fillText(tenant.name, W / 2, 230);
    g.fillStyle = '#77746E';
    g.font = '400 46px "Vazirmatn Variable", Vazirmatn, sans-serif';
    g.fillText(tenant.profile.tagline, W / 2, 310);
    const img = new Image();
    img.src = await QRCode.toDataURL(url, { margin: 0, width: 760, errorCorrectionLevel: 'M' });
    await img.decode();
    g.drawImage(img, (W - 760) / 2, 420, 760, 760);
    g.fillStyle = palette.accent;
    g.beginPath();
    g.roundRect(170, 1290, W - 340, 140, 70);
    g.fill();
    g.fillStyle = palette.accentInk;
    g.font = '800 60px "Vazirmatn Variable", Vazirmatn, sans-serif';
    g.fillText('برای رزرو نوبت اسکن کنید', W / 2, 1382);
    g.fillStyle = '#141414';
    g.direction = 'ltr';
    g.font = '500 36px ui-monospace, monospace';
    g.fillText(url.replace(/^https?:\/\//, ''), W / 2, 1530);
    g.fillStyle = '#9A968F';
    g.font = '400 30px "Vazirmatn Variable", Vazirmatn, sans-serif';
    g.fillText(`Powered by ${BRAND.studio}`, W / 2, 1660);
    const a = document.createElement('a');
    a.download = `nubo-${tenant.slug}-qr.png`;
    a.href = c.toDataURL('image/png');
    a.click();
  };

  const text = `برای رزرو نوبت در ${tenant.name}:\n${url}`;

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="لینک و QR" subtitle="مشتری‌ها از هر جا مستقیم نوبت بگیرند" />
      <Page>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
          <div className="flex flex-col gap-6">
            <Card className="p-5">
              <div className="text-[13px] font-semibold text-muted">لینک صفحه رزرو</div>
              <div className="mono mt-2 truncate rounded-theme bg-surface-2 px-4 py-3 text-[14px]" dir="ltr">
                {url}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="primary" icon={<Copy size={17} />} onClick={copy}>
                  کپی لینک
                </Button>
                <a href={url} target="_blank" rel="noreferrer" className="press inline-flex h-11 items-center gap-2 rounded-theme border border-line bg-surface px-5 font-semibold hover:bg-surface-2">
                  <ExternalLink size={16} /> باز کردن
                </a>
              </div>
            </Card>

            <Card className="p-5">
              <div className="flex items-center gap-2 font-bold">
                <Instagram size={19} /> بیو اینستاگرام
              </div>
              <ol className="mt-3 flex list-inside list-decimal flex-col gap-1.5 text-[14px] leading-7 text-muted">
                <li>در اینستاگرام: Edit profile ← Links ← Add external link</li>
                <li>لینک بالا را بچسبانید و عنوان را «رزرو نوبت» بگذارید.</li>
                <li>در استوری‌ها از استیکر Link با همین آدرس استفاده کنید.</li>
              </ol>
              <div className="mt-4 rounded-theme bg-surface-2 p-3 text-[13px]">
                پیشنهاد متن بیو: <b>«نوبت آنلاین ⬇️ بدون تماس و انتظار»</b>
              </div>
            </Card>

            <Card className="p-5">
              <div className="font-bold">ارسال برای مشتری‌ها</div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer" className="press flex h-11 items-center justify-center gap-2 rounded-theme border border-line font-semibold hover:bg-surface-2">
                  <MessageCircle size={17} /> واتساپ
                </a>
                <a href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`رزرو نوبت در ${tenant.name}`)}`} target="_blank" rel="noreferrer" className="press flex h-11 items-center justify-center gap-2 rounded-theme border border-line font-semibold hover:bg-surface-2">
                  <Send size={17} /> تلگرام
                </a>
                <a href={`sms:?body=${encodeURIComponent(text)}`} className="press flex h-11 items-center justify-center gap-2 rounded-theme border border-line font-semibold hover:bg-surface-2">
                  پیامک
                </a>
              </div>
            </Card>
          </div>

          <aside>
            <Card className="flex flex-col items-center p-6 text-center">
              <div className="text-[13px] font-semibold text-muted">QR پیشخوان</div>
              <div className="mt-4 rounded-theme-lg bg-white p-4">{qr ? <img src={qr} alt="QR" className="size-56" /> : <div className="size-56" />}</div>
              <div className="mt-3 font-extrabold">{tenant.name}</div>
              <div className="text-[13px] text-muted">برای رزرو نوبت اسکن کنید</div>
              <Button variant="ink" size="lg" block className="mt-5" icon={<Printer size={18} />} onClick={downloadCard}>
                دانلود کارت چاپی
              </Button>
              <a href={qr} download={`nubo-${tenant.slug}-qr-only.png`} className="mt-2 inline-flex h-10 items-center gap-1.5 text-sm font-semibold text-muted hover:text-ink">
                <Download size={15} /> فقط QR
              </a>
            </Card>
          </aside>
        </div>
      </Page>
    </div>
  );
}
