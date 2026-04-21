export const dynamic = "force-dynamic";

import { sql } from "../../lib/db";

export default async function TestDbPage() {
  const result = await sql`SELECT NOW() as now`;
  return <div>DB connected: {String(result[0].now)}</div>;
}
