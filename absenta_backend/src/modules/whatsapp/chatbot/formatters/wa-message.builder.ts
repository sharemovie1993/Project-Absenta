export class WaMessageBuilder {
  static header(title: string, subtitle?: string): string {
    let msg = `${title}\n`;
    if (subtitle) msg += `${subtitle}\n`;
    msg += `\n`;
    return msg;
  }

  static bulletList(items: { label: string; value: string }[]): string {
    return items.map((i) => `• ${i.label.padEnd(18, ' ')}: ${i.value}`).join('\n') + '\n\n';
  }

  static menuSection(title: string, options: { key: string; label: string }[]): string {
    let msg = `${title}\n`;
    options.forEach((o) => {
      msg += `[${o.key}] ${o.label}\n`;
    });
    msg += `\n`;
    return msg;
  }

  static footer(hint?: string): string {
    if (hint) {
      return `💡 ${hint}`;
    }
    return `💡 Ketik *ANGKA* menu lain atau *[0]* untuk Daftar Menu Utama.`;
  }

  static error(message: string): string {
    return `⚠️ ${message}`;
  }

  static success(title: string, details?: string): string {
    let msg = `✅ *${title}*\n\n`;
    if (details) msg += `${details}\n\n`;
    msg += `💡 Ketik *5* untuk lihat Profil Pribadi atau *[0]* untuk Menu Utama.`;
    return msg;
  }
}
