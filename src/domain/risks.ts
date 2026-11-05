import { isInherited, isOwnerAlive, isVacant, type Profile } from "./profile";
import type { SheetAnswers } from "./sheet";

/**
 * 「負動産」にしないために、早めに手を打つと楽になる点。
 *
 * 売る・貸す・解体するときに、時間や費用がかかりやすい事情を、これまでの回答から拾う。
 * 価値や価格の判断はしない。「早めにやること」と相談先を示すだけにする。
 */

export interface Risk {
  id: string;
  /** 当てはまる事情 */
  title: string;
  /** なぜ早めに手を打つとよいか */
  why: string;
  /** 早めにやること */
  action: string;
}

export function findRisks(p: Profile, a: SheetAnswers): Risk[] {
  const risks: Risk[] = [];

  if (isOwnerAlive(p) && p.ownerCanDecide === "no") {
    risks.push({
      id: "owner-capacity",
      title: "持ち主が、自分で判断することが難しい",
      why: "このままでは、売る・貸すなどの契約ができません。手続きには数か月かかることがあります。",
      action: "成年後見制度について、市町村の地域包括支援センターや相談窓口に聞いておく",
    });
  }

  if (isInherited(p) && p.heirsCount !== null && p.heirsCount > 1 && a.coOwnersAgree !== "agree") {
    risks.push({
      id: "co-ownership",
      title: `相続人が${p.heirsCount}人いて、考えがまだそろっていない`,
      why: "共有名義になると、売る・解体するたびに全員の同意が必要です。年月がたつほど、話し合う相手が増えます。",
      action: "誰が引き継ぐか、売って分けるかを、早めに家族で話し合う",
    });
  }

  if (isInherited(p) && a.registration !== null && a.registration !== "done") {
    risks.push({
      id: "registration",
      title: "名義の変更（相続登記）がまだ",
      why: "名義が変わらないと、売ることができません。相続人が亡くなると、手続きがさらに複雑になります。",
      action: "司法書士に相談し、相続登記を進める",
    });
  }

  if (a.road !== null && a.road !== "car_ok") {
    risks.push({
      id: "road",
      title: a.road === "narrow" ? "家の前の道が細い" : "家の前の道の状況が分からない",
      why: "道の幅や接し方によっては、建て替えができない土地のことがあります。買う人・借りる人が限られます。",
      action: "市町村の建築担当や不動産会社に、建て替えができる土地かを確かめる",
    });
  }

  if (a.boundary === "no" || (a.boundary === "unknown" && isOwnerAlive(p))) {
    risks.push({
      id: "boundary",
      title: "隣の土地との境目がはっきりしない",
      why: "売るときに測量や立ち会いが必要になり、時間がかかります。昔のことを知る人がいなくなると、さらに難しくなります。",
      action: "親や近所の人に境目の場所を聞いておく。必要なら土地家屋調査士に相談する",
    });
  }

  if (p.hasFarmland === "yes" || p.hasForest === "yes") {
    const kinds = [p.hasFarmland === "yes" ? "田・畑" : null, p.hasForest === "yes" ? "山林" : null].filter(Boolean).join("と");
    risks.push({
      id: "land",
      title: `${kinds}が含まれる`,
      why: "建物とは別に、売る・貸す・駐車場などにするための許可や届出が必要です。買う人が限られることもあります。",
      action: "農業委員会・林務担当に、手続きと、引き受け手を探す方法を聞く",
    });
  }

  if (a.leak === "yes" || a.termite === "yes" || a.tilt === "yes") {
    const signs = [a.leak === "yes" ? "雨もり" : null, a.termite === "yes" ? "シロアリ" : null, a.tilt === "yes" ? "傾き" : null]
      .filter(Boolean)
      .join("・");
    risks.push({
      id: "damage",
      title: `建物に傷みがある（${signs}）`,
      why: "人が住まない家は傷みが早く進みます。直す費用が大きくなると、解体しか選べなくなることがあります。",
      action: "傷みが進む前に、直すか・解体するかを不動産会社や工務店と相談する",
    });
  }

  if (a.belongings === "full") {
    risks.push({
      id: "belongings",
      title: "家じゅうに家財が残っている",
      why: "片付けが済まないと、見てもらうことも、売る・貸すこともしにくくなります。片付けには何度かの帰省が必要です。",
      action: "残す物を家族で決め、片付けの見積もりを取る。次の帰省で取り分けを始める",
    });
  }

  if (isVacant(p) && p.nextVisit === null) {
    risks.push({
      id: "no-visit",
      title: "次に行く予定がまだ決まっていない",
      why: "空き家は、見回りの間が空くほど傷みや近所への影響が出やすくなります。",
      action: "次の帰省の日を決めるか、近所の人や管理サービスに見回りを頼む",
    });
  }

  return risks;
}
