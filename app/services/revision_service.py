def _compute_diff_and_narrative(old_html: str, new_html: str, chapter_title: str) -> str:
    from diff_match_patch import diff_match_patch
    import html2text

    h2t = html2text.HTML2Text()
    h2t.ignore_links = True
    h2t.ignore_images = True
    h2t.body_width = 0

    old_text = h2t.handle(old_html)
    new_text = h2t.handle(new_html)

    dmp = diff_match_patch()
    diffs = dmp.diff_main(old_text, new_text)
    dmp.diff_cleanupSemantic(diffs)

    # Convert diffs to text focusing on additions and meaningful changes
    changes = []
    for op, data in diffs:
        if op == 1: # Insert
            changes.append(f"Added: '{data}'")
        elif op == -1: # Delete
            changes.append(f"Removed: '{data}'")

    if not changes:
         return "Tidak ada perubahan signifikan pada konten ini."

    diff_summary = "\n".join(changes[:10]) # Limit to 10 changes to avoid hitting token limits
    
    return diff_summary
