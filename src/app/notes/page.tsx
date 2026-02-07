"use client";

import { useState } from "react";
import { Plus, Search, Tag, StickyNote } from "lucide-react";
import type { Memo } from "@/types";

// モックデータ
const mockMemos: Memo[] = [
  {
    id: "m1", content: "AI活用の本質は効率化の先にある「創造性」。これを東北AI維新のキーメッセージにする。具体的な事例として、DGでの月間1,714時間削減→その先で生まれた新規事業案件3つ。",
    tags: ["アイデア", "東北AI維新"],
    createdAt: "2026-02-07T10:30:00",
  },
  {
    id: "m2", content: "BNDのCAIOとして、AI導入の3ステップフレームワークを体系化したい。1.現状把握 2.クイックウィン 3.組織文化変革",
    tags: ["BND", "フレームワーク"],
    createdAt: "2026-02-06T15:20:00",
  },
  {
    id: "m3", content: "来週のMTGで話すこと: Q2のKPI見直し、新規クライアント候補のリストアップ、AIコミュニティのイベント日程",
    tags: ["MTG", "TODO"],
    relatedTaskTitle: "チームMTGアジェンダ確認",
    createdAt: "2026-02-06T09:00:00",
  },
  {
    id: "m4", content: "日本一周の経験を記事にするなら「体験主義が生まれた原体験」として。死ぬかと思った話、怪しいと言われた話、全部入れる。泥臭さがブランド。",
    tags: ["アイデア", "Note記事"],
    createdAt: "2026-02-05T22:15:00",
  },
];

const allTags = Array.from(new Set(mockMemos.flatMap(m => m.tags)));

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return "たった今";
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "昨日";
  return `${days}日前`;
}

export default function NotesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [showNewMemo, setShowNewMemo] = useState(false);
  const [newMemoText, setNewMemoText] = useState("");

  const filteredMemos = mockMemos.filter(memo => {
    if (selectedTag && !memo.tags.includes(selectedTag)) return false;
    if (searchQuery && !memo.content.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[var(--color-foreground)] flex items-center gap-2">
          <StickyNote size={20} className="text-[var(--color-streak)]" />
          メモ
        </h1>
        <button
          onClick={() => setShowNewMemo(true)}
          className="flex items-center gap-1.5 text-xs font-medium text-white bg-[var(--color-streak)] px-3.5 py-2 rounded-full hover:opacity-90 transition-opacity shadow-[var(--shadow-sm)]"
        >
          <Plus size={14} />
          メモ追加
        </button>
      </div>

      {/* 新規メモ入力 */}
      {showNewMemo && (
        <div className="bg-[var(--color-memo)] rounded-[var(--radius-lg)] border border-[var(--color-streak)]/20 p-4 shadow-[var(--shadow-md)] animate-fade-in-up">
          <textarea
            value={newMemoText}
            onChange={(e) => setNewMemoText(e.target.value)}
            placeholder="思いついたことを書こう..."
            className="w-full h-28 bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted)] resize-none focus:outline-none leading-relaxed"
            autoFocus
          />
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-[var(--color-streak)]/10">
            <div className="flex items-center gap-1.5">
              <button className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-[var(--color-muted)] bg-[var(--color-surface)] rounded-full border border-[var(--color-border)] hover:border-[var(--color-streak)] transition-colors">
                <Tag size={10} />
                タグ追加
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setShowNewMemo(false); setNewMemoText(""); }}
                className="text-xs text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
              >
                キャンセル
              </button>
              <button className="text-xs font-medium text-white bg-[var(--color-streak)] px-4 py-1.5 rounded-full hover:opacity-90 transition-opacity">
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 検索 */}
      <div className="relative">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="メモを検索..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
        />
      </div>

      {/* タグフィルター */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        <button
          onClick={() => setSelectedTag(null)}
          className={`shrink-0 px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
            !selectedTag
              ? "bg-[var(--color-streak)] text-white"
              : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]"
          }`}
        >
          すべて
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
            className={`shrink-0 px-3 py-1.5 text-[11px] font-medium rounded-full transition-colors ${
              selectedTag === tag
                ? "bg-[var(--color-streak)] text-white"
                : "bg-[var(--color-surface)] text-[var(--color-muted)] border border-[var(--color-border)]"
            }`}
          >
            #{tag}
          </button>
        ))}
      </div>

      {/* メモ一覧 */}
      <div className="space-y-3">
        {filteredMemos.map((memo, i) => (
          <div
            key={memo.id}
            className="bg-[var(--color-memo)] rounded-[var(--radius-lg)] border border-[var(--color-streak)]/15 p-4 hover:shadow-[var(--shadow-md)] transition-all cursor-pointer animate-fade-in-up"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <p className="text-sm text-[var(--color-foreground)] leading-relaxed line-clamp-3">
              {memo.content}
            </p>
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center gap-1.5">
                {memo.tags.map(tag => (
                  <span key={tag} className="text-[10px] font-medium text-[var(--color-streak)] bg-[var(--color-streak)]/10 px-1.5 py-0.5 rounded">
                    #{tag}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-[var(--color-muted)]">{formatDate(memo.createdAt)}</span>
            </div>
            {memo.relatedTaskTitle && (
              <div className="mt-2 pt-2 border-t border-[var(--color-streak)]/10">
                <span className="text-[10px] text-[var(--color-muted)]">
                  関連: {memo.relatedTaskTitle}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
