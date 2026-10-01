const ukrainianMap: Record<string, string> = {
  А:'A',Б:'B',В:'V',Г:'H',Ґ:'G',Д:'D',Е:'E',Є:'Ye',Ж:'Zh',З:'Z',И:'Y',І:'I',Ї:'Yi',Й:'Y',К:'K',Л:'L',М:'M',Н:'N',О:'O',П:'P',Р:'R',С:'S',Т:'T',У:'U',Ф:'F',Х:'Kh',Ц:'Ts',Ч:'Ch',Ш:'Sh',Щ:'Shch',Ь:'',Ю:'Yu',Я:'Ya',
};

export function memorialSlug(name: string) {
  let latin = '';
  for (const char of name.trim()) {
    const upper = char.toUpperCase();
    const mapped = ukrainianMap[upper];
    if (mapped === undefined) latin += char;
    else latin += char === upper ? mapped : mapped.toLowerCase();
  }
  return latin
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70) || 'memorial';
}
