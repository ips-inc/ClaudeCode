import { createProject } from "@/app/studio/actions";
import { KIND_META, type ProjectKind } from "@/lib/types";

const KINDS: ProjectKind[] = ["gallery", "review", "transfer", "drive"];

export default async function NewProject({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const initial = KINDS.includes(kind as ProjectKind)
    ? (kind as ProjectKind)
    : "gallery";

  return (
    <div className="mx-auto max-w-xl">
      <p className="microlabel mb-2">Create</p>
      <h1 className="display mb-8 text-4xl">New project</h1>
      <form action={createProject} className="space-y-6">
        <fieldset className="space-y-2">
          <legend className="microlabel mb-2">Type</legend>
          {KINDS.map((k) => (
            <label
              key={k}
              className="flex cursor-pointer items-baseline gap-3 border hairline bg-white px-4 py-3 has-checked:border-(--color-ink)"
            >
              <input
                type="radio"
                name="kind"
                value={k}
                defaultChecked={k === initial}
                className="translate-y-px"
              />
              <span className="font-medium">{KIND_META[k].label}</span>
              <span className="ml-auto text-right text-xs text-(--color-stone)">
                {KIND_META[k].blurb}
              </span>
            </label>
          ))}
        </fieldset>
        <label className="block space-y-1.5">
          <span className="microlabel">Title</span>
          <input name="title" type="text" required placeholder="Smith Wedding — Selects" />
        </label>
        <label className="block space-y-1.5">
          <span className="microlabel">Description (optional)</span>
          <textarea name="description" rows={3} />
        </label>
        <button className="btn">Create project</button>
      </form>
    </div>
  );
}
