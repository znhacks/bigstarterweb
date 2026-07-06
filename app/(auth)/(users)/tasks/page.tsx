// app/dashboard/tasks/page.tsx
import { getTenantSubdomain } from "@/lib/tenant";
import { getTaskRepository } from "@/lib/providers";

export default async function TasksPage() {
  const subdomain = await getTenantSubdomain();
  if (!subdomain) return <div>Akses Ditolak</div>;

  const taskRepo = getTaskRepository();

  // Ambil data tanpa peduli apakah ini Model 1 atau Model 2
  const tasks = await taskRepo.list(subdomain);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-xl font-bold">Daftar Tugas {subdomain}</h1>
      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id} className="rounded-lg border bg-slate-50 p-3">
            {task.title}
          </li>
        ))}
      </ul>
    </div>
  );
}
