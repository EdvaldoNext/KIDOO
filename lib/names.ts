export function prettyName(name: string) {
  return name.replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}
