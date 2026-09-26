<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Subscription approvals must use `approve_school_subscription` so the 30-day extension and receipt stay atomic.
- Subscription receipt PDFs are generated client-side from database receipt records to remain edge-runtime compatible.
- Student payment receipts are generated client-side as A5 landscape PDFs so branded downloads remain edge-runtime compatible.
- Student receipt history is reconstructed from persisted payment records so receipts remain available without storing generated PDF files.
- Public school signup lives on the dedicated `/register` route so landing calls to action never mix with login state.
