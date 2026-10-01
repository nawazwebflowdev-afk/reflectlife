const LOCAL_TEMPLATE_IMAGE = /^(\/templates\/[^?#]+)\.(?:png|jpe?g)([?#].*)?$/i;

export const optimizedImageUrl = (url: string | null | undefined): string | null | undefined => {
  if (!url) return url;
  return url.replace(LOCAL_TEMPLATE_IMAGE, "$1.webp$2");
};