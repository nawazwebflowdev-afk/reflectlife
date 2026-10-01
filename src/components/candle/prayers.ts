
import { tr } from "@/i18n/tr";export interface Prayer {
  id: number;
  title: string;
  text: string;
}

export const PRAYERS: Prayer[] = [
  {
    id: 1,
    title: tr("a.83fee3cc6a"),
    text: tr("a.ff43566463"),
  },
  {
    id: 2,
    title: tr("a.48d507d570"),
    text: tr("a.6b32fcbce1"),
  },
  {
    id: 3,
    title: tr("a.f711a2c006"),
    text: tr("a.da4f2bf105"),
  },
  {
    id: 4,
    title: tr("a.a4087f66e9"),
    text: tr("a.58535451dc"),
  },
  {
    id: 5,
    title: tr("a.0a40d854a4"),
    text: tr("a.b9d8c80b75"),
  },
  {
    id: 6,
    title: tr("a.045b54932a"),
    text: tr("a.61ffa28430"),
  },
  {
    id: 7,
    title: tr("a.fede0cb915"),
    text: tr("a.8c71332308"),
  },
  {
    id: 8,
    title: tr("a.bfdb0446ec"),
    text: tr("a.e8a77d4755"),
  },
  {
    id: 9,
    title: tr("a.de230dc7af"),
    text: tr("a.2787bdbe4e"),
  },
  {
    id: 10,
    title: tr("a.fcc5b855af"),
    text: tr("a.7914f32b8e"),
  },
];
