
import { tr } from "@/i18n/tr";export interface Prayer {
  id: number;
  title: string;
  text: string;
}

export const PRAYERS: Prayer[] = [
  {
    id: 1,
    title: tr("a.83fee3cc6a"),
    text: 'Eternal rest grant unto them, O Lord, and let perpetual light shine upon them. May they rest in peace, and may Your everlasting love surround them forever. Amen.',
  },
  {
    id: 2,
    title: tr("a.48d507d570"),
    text: 'May their memory be eternal. May their kindness never be forgotten. May their love continue to live in the hearts of those they touched.',
  },
  {
    id: 3,
    title: tr("a.f711a2c006"),
    text: 'Lord, receive this precious soul into Your heavenly kingdom. Grant them peace beyond all understanding. Comfort those who mourn.',
  },
  {
    id: 4,
    title: tr("a.a4087f66e9"),
    text: 'The Lord is my Shepherd; I shall not want. He leads me beside still waters and restores my soul.',
  },
  {
    id: 5,
    title: tr("a.0a40d854a4"),
    text: 'We light this candle in your memory. May its gentle flame remind us that love is stronger than loss, hope is brighter than sorrow.',
  },
  {
    id: 6,
    title: tr("a.045b54932a"),
    text: 'May the Lord bless your eternal journey. May the angels welcome you with joy. May peace surround your soul.',
  },
  {
    id: 7,
    title: tr("a.fede0cb915"),
    text: 'Though your voice is silent, your love still speaks. Though your hands no longer hold ours, your kindness remains with us.',
  },
  {
    id: 8,
    title: tr("a.bfdb0446ec"),
    text: 'Heavenly Father, bring comfort to every grieving heart. Replace sorrow with hope, fear with faith, and tears with everlasting life.',
  },
  {
    id: 9,
    title: tr("a.de230dc7af"),
    text: 'The years may pass, the seasons may change, but the love we carry for you will never fade.',
  },
  {
    id: 10,
    title: tr("a.fcc5b855af"),
    text: 'A life filled with love never truly ends. May this flame burn as a symbol of hope, remembrance, and everlasting love.',
  },
];
