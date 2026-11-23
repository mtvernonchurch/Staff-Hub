import {
  createDocumentAction,
  createFolderAction,
  createQuickLinkAction,
  editDocumentAction,
  editFolderAction,
  editQuickLinkAction,
} from "@/app/(hub)/actions";
import { Flash, IconImage, OutLink, PageHeader } from "@/components/ui";
import { isAdmin } from "@/lib/domain/access";
import { sortByOrder } from "@/lib/domain/view";
import { requireStaff } from "@/lib/session";

export const metadata = { title: "Documents" };

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const query = await searchParams;
  const { staff, store } = await requireStaff();
  const [documents, links, folders] = await Promise.all([store.listDocuments(), store.listQuickLinks(), store.listFolders()]);
  const admin = isAdmin(staff);
  const groups = new Map<string, typeof documents>();
  for (const document of documents) {
    const group = document.group || "General";
    groups.set(group, [...(groups.get(group) ?? []), document]);
  }

  return (
    <>
      <PageHeader
        kicker="Files stay where they are"
        title="Documents and folders"
        lede="Pins and folders open the real file. The hub does not copy anything."
      />
      <Flash error={query.error} notice={query.notice} />
      <section className="card">
        <h2>Quick links</h2>
        <div className="quick-grid">
          {sortByOrder(links).map((link) => (
            <OutLink key={link.id} className="quick-link" href={link.url}>
              <span>{link.name}</span>
              <IconImage icon={link.icon} alt="" />
            </OutLink>
          ))}
        </div>
        {admin ? (
          <details>
            <summary>Add or edit a link</summary>
            <form action={createQuickLinkAction} className="stack-form">
              <input type="hidden" name="returnTo" value="/documents" />
              <label className="field">Name<input name="name" required /></label>
              <label className="field">URL<input name="url" required placeholder="https://" /></label>
              <label className="field">Icon word <span>drive, folder, chat, calendar, or link</span><input name="icon" defaultValue="link" /></label>
              <label className="field">Order<input name="order" defaultValue={String(links.length + 1)} /></label>
              <label className="field">Initials<input name="initials" maxLength={3} /></label>
              <label className="field">Color
                <select name="color" defaultValue="navy">
                  <option>navy</option><option>blue</option><option>green</option><option>mint</option><option>orange</option><option>rose</option>
                </select>
              </label>
              <label className="field">Who can see it<input name="visibleTo" defaultValue="All" placeholder="All, Admin, or a ministry" /></label>
              <button className="btn" type="submit">Add link</button>
            </form>
            {links.map((link) => (
              <form key={link.id} action={editQuickLinkAction} className="stack-form">
                <input type="hidden" name="returnTo" value="/documents" />
                <input type="hidden" name="id" value={link.id} />
                <label className="field">Name<input name="name" defaultValue={link.name} /></label>
                <label className="field">URL<input name="url" defaultValue={link.url} /></label>
                <label className="field">Icon<input name="icon" defaultValue={link.icon} /></label>
                <label className="field">Order<input name="order" defaultValue={link.order} /></label>
                <label className="field">Initials<input name="initials" defaultValue={link.initials} maxLength={3} /></label>
                <label className="field">Color
                  <select name="color" defaultValue={link.color || "navy"}>
                    <option>navy</option><option>blue</option><option>green</option><option>mint</option><option>orange</option><option>rose</option>
                  </select>
                </label>
                <label className="field">Who can see it<input name="visibleTo" defaultValue={link.visibleTo || "All"} /></label>
                <label className="checks"><input type="checkbox" name="hidden" value="yes" defaultChecked={link.hidden} /> Hidden</label>
                <button className="btn btn-small" type="submit">Save {link.name}</button>
              </form>
            ))}
          </details>
        ) : null}
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Folders</h2>
        <div className="folder-grid">
          {sortByOrder(folders).map((folder) => (
            <OutLink key={folder.id} className="folder-card" href={folder.url}>{folder.name}</OutLink>
          ))}
        </div>
        {admin ? (
          <details>
            <summary>Add or edit a folder</summary>
            <form action={createFolderAction} className="stack-form">
              <input type="hidden" name="returnTo" value="/documents" />
              <label className="field">Name<input name="name" required /></label>
              <label className="field">URL<input name="url" required placeholder="https://" /></label>
              <label className="field">Order<input name="order" defaultValue={String(folders.length + 1)} /></label>
              <button className="btn" type="submit">Add folder</button>
            </form>
            {folders.map((folder) => (
              <form key={folder.id} action={editFolderAction} className="stack-form">
                <input type="hidden" name="returnTo" value="/documents" />
                <input type="hidden" name="id" value={folder.id} />
                <label className="field">Name<input name="name" defaultValue={folder.name} /></label>
                <label className="field">URL<input name="url" defaultValue={folder.url} /></label>
                <label className="field">Order<input name="order" defaultValue={folder.order} /></label>
                <button className="btn btn-small" type="submit">Save {folder.name}</button>
              </form>
            ))}
          </details>
        ) : null}
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2>Pinned documents</h2>
        {[...groups.entries()].map(([group, docs]) => (
          <div key={group}>
            <p className="group-title">{group}</p>
            {docs.map((document) => (
              <article key={document.id} className="item">
                <div>
                  <h3><OutLink href={document.link}>{document.title}</OutLink></h3>
                  {document.notes ? <p className="note">{document.notes}</p> : null}
                </div>
                {admin ? (
                  <details>
                    <summary>Edit</summary>
                    <form action={editDocumentAction} className="stack-form">
                      <input type="hidden" name="returnTo" value="/documents" />
                      <input type="hidden" name="id" value={document.id} />
                      <label className="field">Title<input name="title" defaultValue={document.title} /></label>
                      <label className="field">Group<input name="group" defaultValue={document.group} /></label>
                      <label className="field">Link<input name="link" defaultValue={document.link} /></label>
                      <label className="field">Notes<textarea name="notes" defaultValue={document.notes} rows={2} /></label>
                      <button className="btn btn-small" type="submit">Save</button>
                    </form>
                  </details>
                ) : null}
              </article>
            ))}
          </div>
        ))}
        {documents.length === 0 ? <p className="empty">No documents pinned yet.</p> : null}
        {admin ? (
          <details>
            <summary>Pin a document</summary>
            <form action={createDocumentAction} className="stack-form">
              <input type="hidden" name="returnTo" value="/documents" />
              <label className="field">Title<input name="title" required /></label>
              <label className="field">Group<input name="group" placeholder="Templates, Policies, Ministry guides" /></label>
              <label className="field">Link<input name="link" required placeholder="https://" /></label>
              <label className="field">Notes<textarea name="notes" rows={2} /></label>
              <button className="btn btn-primary" type="submit">Pin document</button>
            </form>
          </details>
        ) : null}
      </section>
    </>
  );
}
