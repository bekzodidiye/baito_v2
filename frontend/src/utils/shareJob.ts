import { Language } from '../translations';

/** Share a job, or fall back to copying its link.
 *
 *  `navigator.share` is a mobile-first API: it is absent in desktop Chrome and
 *  Firefox. Two of the three share buttons used to call it behind an `if` with
 *  no `else`, so on a desktop the button did nothing at all — no sheet, no copy,
 *  no message. Only the job-details header had the fallback. This is that
 *  fallback, in one place, so the three agree.
 *  @param job Job metadata required for sharing (id, title, company).
 *  @param language Active UI language for feedback toast messages.
 */
export const shareJob = async (
  job: { id: string; title: string; company: string },
  language: Language,
): Promise<void> => {
  const url = `${window.location.origin}/?jobId=${job.id}`;

  if (navigator.share) {
    try {
      await navigator.share({ title: job.title, text: `${job.title} - ${job.company}`, url });
      return;
    } catch (error) {
      // The user dismissing the share sheet is not a failure; do not fall
      // through to a copy they did not ask for.
      if ((error as DOMException)?.name === 'AbortError') return;
    }
  }

  try {
    await navigator.clipboard?.writeText(url);
  } catch {
    // Clipboard can be refused (insecure context, denied permission). Say so
    // rather than claiming a copy that did not happen.
    window.dispatchEvent(new CustomEvent('global-toast', {
      detail: {
        message: language === 'uz' ? "Havolani nusxalab bo'lmadi"
          : language === 'ru' ? 'Не удалось скопировать ссылку'
            : 'The link could not be copied',
        type: 'error',
      },
    }));
    return;
  }

  window.dispatchEvent(new CustomEvent('global-toast', {
    detail: {
      message: language === 'uz' ? "E'lon havolasi nusxalandi!"
        : language === 'ru' ? 'Ссылка скопирована!'
          : 'Link copied!',
      type: 'success',
    },
  }));
};
