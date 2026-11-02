import { formatJapaneseDate } from "../domain/dates";
import type { SheetDocument } from "../domain/sheet";

interface Props {
  sheet: SheetDocument;
  appName: string;
  onEdit: () => void;
  onBack: () => void;
}

export function SheetPreview({ sheet, appName, onEdit, onBack }: Props) {
  const unknownCount = sheet.sections.flatMap((s) => s.rows).filter((r) => r.unknown).length;

  return (
    <div className="py-6">
      <div className="no-print mx-auto max-w-2xl space-y-4">
        <h1 className="text-2xl font-bold text-ink">不動産会社に渡すシートができました</h1>
        <p className="text-ink">
          このシートを印刷して持っていくか、PDFにして送ってください。名前と電話番号は、印刷したあとに手で書き込みます（このアプリには保存しません）。
        </p>
        <button type="button" onClick={() => window.print()} className="btn-primary w-full text-lg">
          印刷する・PDFで保存する
        </button>
        <details className="card">
          <summary className="cursor-pointer font-semibold text-ink">PDFで保存するには？</summary>
          <ol className="mt-3 list-decimal space-y-2 pl-6 text-ink">
            <li>上の「印刷する・PDFで保存する」を押します。</li>
            <li>
              パソコンでは、「送信先」や「プリンター」の欄で<strong>「PDFに保存」</strong>を選んで「保存」を押します。
            </li>
            <li>
              iPhone では、出てきた画面の右上の<strong>共有ボタン（四角に上向きの矢印）</strong>から、メールや LINE で送れます。
            </li>
            <li>Android では、プリンターの選択で<strong>「PDF 形式で保存」</strong>を選びます。</li>
          </ol>
        </details>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={onEdit} className="btn-secondary">
            答えを直す
          </button>
          <button type="button" onClick={onBack} className="btn-secondary">
            やることリストに戻る
          </button>
        </div>
        {unknownCount > 0 && (
          <p className="text-sm text-muted">
            「分からない」の項目が{unknownCount}件あります。そのままで大丈夫です。不動産会社が調べる項目として伝わります。
          </p>
        )}
      </div>

      <article className="sheet mx-auto mt-8 max-w-[210mm] bg-white p-8 text-[#222] shadow-sm print:mt-0 print:p-0 print:shadow-none">
        <header className="flex items-end justify-between border-b-2 border-[#222] pb-2">
          <h2 className="text-xl font-bold">空き家（実家）についてのご相談シート</h2>
          <span className="text-sm">作成日：{formatJapaneseDate(sheet.createdOn)}</span>
        </header>
        <p className="mt-2 text-xs leading-relaxed">
          所有者側が把握している範囲で記入しています。「分からない」の項目は、調べていただけると助かります。
        </p>

        <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 print:grid-cols-2">
          {sheet.sections.map((section) => (
            <section key={section.title} className="sheet-block">
              <h3 className="border-l-4 border-[#2f6b55] pl-2 text-sm font-bold">{section.title}</h3>
              <table className="mt-1 w-full border-collapse text-xs">
                <tbody>
                  {section.rows.map((r, i) => (
                    <tr key={`${r.label}-${i}`} className="border-b border-[#ddd] align-top">
                      {r.label && <th className="w-[42%] py-1 pr-2 text-left font-normal text-[#555]">{r.label}</th>}
                      <td className={`py-1 ${r.unknown ? "text-[#a8322b]" : "font-semibold"}`} colSpan={r.label ? 1 : 2}>
                        <span className="whitespace-pre-wrap">{r.value}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}
        </div>

        <section className="sheet-block mt-5">
          <h3 className="border-l-4 border-[#2f6b55] pl-2 text-sm font-bold">不動産会社に確認したいこと</h3>
          <ol className="mt-1 list-decimal space-y-0.5 pl-5 text-xs leading-relaxed">
            {sheet.questionsForAgent.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
        </section>

        <section className="sheet-block mt-5">
          <h3 className="border-l-4 border-[#2f6b55] pl-2 text-sm font-bold">連絡先（手書きでご記入ください）</h3>
          <table className="mt-1 w-full border-collapse text-xs">
            <tbody>
              {["お名前", "電話番号", "連絡がつきやすい時間帯", "連絡の方法の希望（電話・メール・郵送）"].map((label) => (
                <tr key={label} className="border-b border-[#999]">
                  <th className="w-[42%] py-3 pr-2 text-left font-normal text-[#555]">{label}</th>
                  <td className="py-3" />
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-5 border-t border-[#ddd] pt-2 text-[10px] leading-relaxed text-[#666]">
          このシートは「{appName}」で作成しました。記載内容は所有者側の認識に基づくもので、法律・税務・価格の判断を示すものではありません。
        </footer>
      </article>
    </div>
  );
}
