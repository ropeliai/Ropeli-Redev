# Step 1 — Point Cursor / Windows temp to D: (manual)

Run **PowerShell as your user** (not necessarily admin for User scope):

```powershell
[System.Environment]::SetEnvironmentVariable("TEMP", "D:\temp", "User")
[System.Environment]::SetEnvironmentVariable("TMP", "D:\temp", "User")
New-Item -ItemType Directory -Force -Path "D:\temp"
```

Then **fully close and reopen Cursor** (and any terminals) so new processes pick up `TEMP` / `TMP`.

To verify in a **new** PowerShell window:

```powershell
$env:TEMP
$env:TMP
```

Both should show `D:\temp`.
