#!/usr/bin/env python3
"""
Claude Code セッションログから AI チームメトリクスを集計し、
public/team-metrics.json に出力するスクリプト。

Usage: python3 scripts/sync-team-metrics.py
"""

import json
import glob
import os
from collections import Counter, defaultdict
from datetime import datetime, timezone

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS_BASE = os.path.expanduser("~/.claude/projects")
OUTPUT_PATH = os.path.join(PROJECT_ROOT, "public", "team-metrics.json")

# my-ai-team 関連のプロジェクトディレクトリのみ対象
FILTER_KEYWORD = "my-ai-team"

# AI社員名とプロジェクトディレクトリの対応
EMPLOYEE_DIR_MAP = {
    "リン": "executive-COO",
    "ミナミ": "secretary",
    "マコト": "hr",
    "ソウ": "web-team",
    "ナギ": "web-team",
    "ユウ": "web-team",
    "カイト": "web-team",
    "コトハ": "note-team",
    "ツムギ": "note-team",
    "レン": "note-team",
    "ソラ": "note-team",
    "ヒカル": "creative-team",
    "カナデ": "creative-team",
    "カノン": "creative-team",
    "アヤ": "slides-team",
    "ハルカ": "slides-team",
    "ユキ": "prompt-team",
    "タクミ": "coach",
    "シオン": "coach",
}


def get_jsonl_files():
    """my-ai-team関連のJSONLファイルを取得"""
    pattern = os.path.join(LOGS_BASE, "*", "*.jsonl")
    all_files = glob.glob(pattern)
    return [f for f in all_files if FILTER_KEYWORD in os.path.basename(os.path.dirname(f))]


def parse_sessions(files):
    """セッションログをパースしてメトリクスを集計"""
    tool_counts = Counter()
    session_ids = set()
    mcp_count = 0
    task_count = 0
    skill_count = 0
    message_count = 0
    active_dirs = set()
    daily_sessions = defaultdict(set)
    daily_tools = defaultdict(int)
    daily_messages = defaultdict(int)
    tool_by_category = defaultdict(int)

    # AI社員ごとのアクティビティ
    employee_activity = defaultdict(lambda: {"sessions": 0, "tools": 0, "messages": 0})

    for f in files:
        dir_name = os.path.basename(os.path.dirname(f))
        active_dirs.add(dir_name)

        # どのAI社員のプロジェクトか特定
        employee_name = None
        for name, team_key in EMPLOYEE_DIR_MAP.items():
            if team_key in dir_name:
                employee_name = name
                break

        with open(f, encoding="utf-8") as fh:
            for line in fh:
                try:
                    entry = json.loads(line)
                except (json.JSONDecodeError, UnicodeDecodeError):
                    continue

                sid = entry.get("sessionId")
                ts = entry.get("timestamp", "")
                date_key = ts[:10] if len(ts) >= 10 else None

                if sid:
                    session_ids.add(sid)
                    if date_key:
                        daily_sessions[date_key].add(sid)

                msg = entry.get("message", {})

                # ユーザーメッセージ数
                if msg.get("role") == "user" and isinstance(msg.get("content"), str):
                    message_count += 1
                    if date_key:
                        daily_messages[date_key] += 1
                    if employee_name:
                        employee_activity[employee_name]["messages"] += 1

                # ツール利用
                content = msg.get("content", [])
                if isinstance(content, list):
                    for c in content:
                        if isinstance(c, dict) and c.get("type") == "tool_use":
                            name = c.get("name", "")
                            tool_counts[name] += 1
                            if date_key:
                                daily_tools[date_key] += 1

                            if employee_name:
                                employee_activity[employee_name]["tools"] += 1

                            # カテゴリ分類
                            if name.startswith("mcp__"):
                                mcp_count += 1
                                tool_by_category["MCP"] += 1
                            elif name == "Task":
                                task_count += 1
                                tool_by_category["Subagent"] += 1
                            elif name == "Skill":
                                skill_count += 1
                                tool_by_category["Skill"] += 1
                            elif name in ("Read", "Write", "Edit", "Glob", "Grep"):
                                tool_by_category["FileOps"] += 1
                            elif name == "Bash":
                                tool_by_category["Bash"] += 1
                            elif name in ("WebSearch", "WebFetch"):
                                tool_by_category["Web"] += 1
                            else:
                                tool_by_category["Other"] += 1

    # アクティブなAI社員を判定（何かしらのアクティビティがある社員）
    active_employees = [name for name, data in employee_activity.items() if data["tools"] > 0 or data["messages"] > 0]

    # 日別トレンド（直近14日）
    all_dates = sorted(set(list(daily_sessions.keys()) + list(daily_tools.keys()) + list(daily_messages.keys())))
    recent_dates = all_dates[-14:] if len(all_dates) >= 14 else all_dates
    daily_trend = []
    for d in recent_dates:
        daily_trend.append({
            "date": d,
            "sessions": len(daily_sessions.get(d, set())),
            "tools": daily_tools.get(d, 0),
            "messages": daily_messages.get(d, 0),
        })

    # Top MCP ツール
    mcp_tools = {k: v for k, v in tool_counts.items() if k.startswith("mcp__")}
    top_mcp = sorted(mcp_tools.items(), key=lambda x: -x[1])[:10]
    top_mcp_list = [{"name": name.replace("mcp__", ""), "count": count} for name, count in top_mcp]

    # Top ツール全体
    top_tools = [{"name": name, "count": count} for name, count in tool_counts.most_common(15)]

    total_tools = sum(tool_counts.values())

    return {
        "summary": {
            "skillCalls": skill_count,
            "subagentCalls": task_count,
            "mcpCalls": mcp_count,
            "messages": message_count,
            "activeEmployees": len(active_employees),
            "totalEmployees": len(EMPLOYEE_DIR_MAP),
            "sessions": len(session_ids),
            "totalToolCalls": total_tools,
        },
        "toolBreakdown": dict(tool_by_category),
        "topTools": top_tools,
        "topMcpTools": top_mcp_list,
        "dailyTrend": daily_trend,
        "activeEmployeeNames": sorted(active_employees),
        "generatedAt": datetime.now(timezone.utc).isoformat(),
    }


def main():
    files = get_jsonl_files()
    print(f"Found {len(files)} session log files")

    metrics = parse_sessions(files)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(metrics, f, ensure_ascii=False, indent=2)

    print(f"Metrics written to {OUTPUT_PATH}")
    s = metrics["summary"]
    print(f"  Sessions: {s['sessions']}")
    print(f"  Messages: {s['messages']}")
    print(f"  Skill calls: {s['skillCalls']}")
    print(f"  Subagent calls: {s['subagentCalls']}")
    print(f"  MCP calls: {s['mcpCalls']}")
    print(f"  Active employees: {s['activeEmployees']}/{s['totalEmployees']}")


if __name__ == "__main__":
    main()
