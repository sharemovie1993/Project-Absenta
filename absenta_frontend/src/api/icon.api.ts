export async function getIconNames(): Promise<string[]> {
  try {
    const res = await fetch('/icons/lucide.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch icons');
    const data = await res.json();
    if (Array.isArray(data)) return data as string[];
    return [];
  } catch {
    return [];
  }
}

