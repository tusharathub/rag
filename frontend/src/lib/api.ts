export function getApiBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
  url = url.trim().replace(/\/+$/, "");
  if (!url.endsWith("/api/v1")) {
    url = `${url}/api/v1`;
  }
  return url;
}
