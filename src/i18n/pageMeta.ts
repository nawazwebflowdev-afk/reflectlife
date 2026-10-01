/** Per-route <title>/<meta description> in every site language. Keys are base paths (without /es or /de). */
type Meta = { title: string; description: string };
type Lang = "en" | "uk" | "es" | "de";

const pages: Record<string, Record<Lang, Meta>> = {
  "/": {
    en: { title: "Reflectlife — Online memorials to remember your loved ones", description: "Create a warm online memorial, light candles and share memories with family and friends." },
    uk: { title: "Reflectlife — сторінки пам'яті про рідних", description: "Створіть теплу сторінку пам'яті, запаліть свічку та діліться спогадами з рідними." },
    es: { title: "Reflectlife — Memoriales en línea para recordar a tus seres queridos", description: "Crea un memorial en línea, enciende velas y comparte recuerdos con tu familia y amigos." },
    de: { title: "Reflectlife — Online-Gedenkseiten für deine Liebsten", description: "Erstelle eine liebevolle Gedenkseite, zünde Kerzen an und teile Erinnerungen mit Familie und Freunden." },
  },
  "/memorials": {
    en: { title: "Memorial Wall | Reflectlife", description: "Visit public memorials and honour those who are remembered." },
    uk: { title: "Стіна пам'яті | Reflectlife", description: "Відвідайте сторінки пам'яті та вшануйте тих, кого пам'ятають." },
    es: { title: "Muro de homenaje | Reflectlife", description: "Visita los memoriales públicos y honra a quienes son recordados." },
    de: { title: "Gedenkwand | Reflectlife", description: "Besuche öffentliche Gedenkseiten und ehre die Menschen, an die erinnert wird." },
  },
  "/templates": {
    en: { title: "Memorial Templates | Reflectlife", description: "Beautiful designs for memorial pages, timelines and family trees." },
    uk: { title: "Шаблони | Reflectlife", description: "Гарні оформлення для сторінок пам'яті, хронік і родинних дерев." },
    es: { title: "Plantillas de memorial | Reflectlife", description: "Diseños hermosos para memoriales, cronologías y árboles familiares." },
    de: { title: "Vorlagen für Gedenkseiten | Reflectlife", description: "Schöne Designs für Gedenkseiten, Zeitleisten und Stammbäume." },
  },
  "/about": {
    en: { title: "About Reflectlife", description: "Why we built a calm place to preserve and share the stories of loved ones." },
    uk: { title: "Про Reflectlife", description: "Чому ми створили спокійне місце, щоб берегти історії рідних." },
    es: { title: "Acerca de Reflectlife", description: "Por qué creamos un lugar tranquilo para guardar y compartir las historias de tus seres queridos." },
    de: { title: "Über Reflectlife", description: "Warum wir einen ruhigen Ort geschaffen haben, um Geschichten geliebter Menschen zu bewahren." },
  },
  "/help": {
    en: { title: "Help Centre | Reflectlife", description: "Answers and support for creating and managing memorials." },
    uk: { title: "Довідка | Reflectlife", description: "Відповіді та підтримка щодо сторінок пам'яті." },
    es: { title: "Centro de ayuda | Reflectlife", description: "Respuestas y apoyo para crear y administrar memoriales." },
    de: { title: "Hilfe | Reflectlife", description: "Antworten und Unterstützung rund um Gedenkseiten." },
  },
  "/privacy-policy": {
    en: { title: "Privacy Policy | Reflectlife", description: "How Reflectlife collects, uses and protects your personal data." },
    uk: { title: "Політика конфіденційності | Reflectlife", description: "Як Reflectlife збирає, використовує та захищає ваші дані." },
    es: { title: "Política de privacidad | Reflectlife", description: "Cómo Reflectlife recopila, usa y protege tus datos personales." },
    de: { title: "Datenschutzerklärung | Reflectlife", description: "Wie Reflectlife deine personenbezogenen Daten erhebt, nutzt und schützt." },
  },
  "/cookie-policy": {
    en: { title: "Cookie Policy | Reflectlife", description: "Which cookies Reflectlife uses and how to manage them." },
    uk: { title: "Політика cookie | Reflectlife", description: "Які файли cookie використовує Reflectlife і як ними керувати." },
    es: { title: "Política de cookies | Reflectlife", description: "Qué cookies usa Reflectlife y cómo administrarlas." },
    de: { title: "Cookie-Richtlinie | Reflectlife", description: "Welche Cookies Reflectlife verwendet und wie du sie verwaltest." },
  },
  "/signup": {
    en: { title: "Create your account | Reflectlife", description: "Join Reflectlife to create memorials and share memories." },
    uk: { title: "Реєстрація | Reflectlife", description: "Приєднуйтеся до Reflectlife, щоб створювати сторінки пам'яті." },
    es: { title: "Crea tu cuenta | Reflectlife", description: "Únete a Reflectlife para crear memoriales y compartir recuerdos." },
    de: { title: "Konto erstellen | Reflectlife", description: "Werde Teil von Reflectlife, um Gedenkseiten zu erstellen und Erinnerungen zu teilen." },
  },
  "/login": {
    en: { title: "Sign in | Reflectlife", description: "Sign in to your Reflectlife account." },
    uk: { title: "Вхід | Reflectlife", description: "Увійдіть до свого облікового запису Reflectlife." },
    es: { title: "Iniciar sesión | Reflectlife", description: "Inicia sesión en tu cuenta de Reflectlife." },
    de: { title: "Anmelden | Reflectlife", description: "Melde dich bei deinem Reflectlife-Konto an." },
  },
  "/dashboard": {
    en: { title: "Dashboard | Reflectlife", description: "Your memorials, memories and reminders." },
    uk: { title: "Панель | Reflectlife", description: "Ваші сторінки пам'яті, спогади та нагадування." },
    es: { title: "Panel | Reflectlife", description: "Tus memoriales, recuerdos y recordatorios." },
    de: { title: "Übersicht | Reflectlife", description: "Deine Gedenkseiten, Erinnerungen und Termine." },
  },
  "/timeline": {
    en: { title: "Timeline | Reflectlife", description: "Shared memories from the Reflectlife community." },
    uk: { title: "Хроніка | Reflectlife", description: "Спогади спільноти Reflectlife." },
    es: { title: "Cronología | Reflectlife", description: "Recuerdos compartidos por la comunidad de Reflectlife." },
    de: { title: "Zeitleiste | Reflectlife", description: "Geteilte Erinnerungen der Reflectlife-Gemeinschaft." },
  },
  "/tree": {
    en: { title: "Family Tree | Reflectlife", description: "Build and explore your family tree." },
    uk: { title: "Родинне дерево | Reflectlife", description: "Створюйте та досліджуйте своє родинне дерево." },
    es: { title: "Árbol familiar | Reflectlife", description: "Crea y explora tu árbol familiar." },
    de: { title: "Stammbaum | Reflectlife", description: "Erstelle und entdecke deinen Stammbaum." },
  },
  "/diary": {
    en: { title: "My Diary | Reflectlife", description: "A private place for your thoughts and memories." },
    uk: { title: "Мій щоденник | Reflectlife", description: "Приватне місце для ваших думок і спогадів." },
    es: { title: "Mi diario | Reflectlife", description: "Un lugar privado para tus pensamientos y recuerdos." },
    de: { title: "Mein Tagebuch | Reflectlife", description: "Ein privater Ort für deine Gedanken und Erinnerungen." },
  },
  "/settings": {
    en: { title: "Settings | Reflectlife", description: "Manage your Reflectlife account." },
    uk: { title: "Налаштування | Reflectlife", description: "Керуйте своїм обліковим записом Reflectlife." },
    es: { title: "Configuración | Reflectlife", description: "Administra tu cuenta de Reflectlife." },
    de: { title: "Einstellungen | Reflectlife", description: "Verwalte dein Reflectlife-Konto." },
  },
};

const fallback = pages["/"];

/** Meta for a base path; memorial and other dynamic pages may override with their own Helmet. */
export const pageMeta = (pathname: string, lang: string): Meta => {
  const l = (["en", "uk", "es", "de"].includes(lang) ? lang : "en") as Lang;
  return (pages[pathname] ?? fallback)[l];
};
