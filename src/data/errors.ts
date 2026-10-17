export type DataErrorCode = 'NOT_FOUND' | 'SLOT_TAKEN' | 'FORBIDDEN' | 'CONFLICT' | 'VALIDATION' | 'SUSPENDED';

export class DataError extends Error {
  constructor(
    public code: DataErrorCode,
    message?: string,
  ) {
    super(message ?? code);
  }
}

const MESSAGES: Record<DataErrorCode, string> = {
  NOT_FOUND: 'پیدا نشد',
  SLOT_TAKEN: 'این زمان همین حالا رزرو شد. لطفاً زمان دیگری انتخاب کنید.',
  FORBIDDEN: 'اجازه این کار را ندارید',
  CONFLICT: 'این مورد تکراری است',
  VALIDATION: 'اطلاعات وارد شده درست نیست',
  SUSPENDED: 'این کسب‌وکار موقتاً غیرفعال است',
};

/** A friendly Persian message for any error thrown by the data layer. */
export function errorMessage(e: unknown): string {
  if (e instanceof DataError) return e.message && e.message !== e.code ? e.message : MESSAGES[e.code];
  return 'مشکلی پیش آمد. دوباره تلاش کنید.';
}
