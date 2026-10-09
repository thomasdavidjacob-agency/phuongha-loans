param([string]$Xlsx, [string]$OutCsv)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zip = [IO.Compression.ZipFile]::OpenRead($Xlsx)
function ReadEntry($name) { $e = $zip.Entries | Where-Object { $_.FullName -eq $name }; $sr = New-Object IO.StreamReader($e.Open()); $t = $sr.ReadToEnd(); $sr.Close(); [xml]$t }
$ss = ReadEntry 'xl/sharedStrings.xml'
$strings = @(); foreach ($si in $ss.sst.si) { if ($si.t -is [string]) { $strings += $si.t } elseif ($si.t.'#text') { $strings += $si.t.'#text' } else { $strings += (($si.r | ForEach-Object { if ($_.t -is [string]) { $_.t } else { $_.t.'#text' } }) -join '') } }
$sheets = $zip.Entries | Where-Object { $_.FullName -like 'xl/worksheets/sheet*.xml' } | ForEach-Object FullName
"sheets: $($sheets -join ', ')"
$sh = ReadEntry $sheets[0]
function ColIdx($ref) { $l = ($ref -replace '\d', ''); $n = 0; foreach ($c in $l.ToCharArray()) { $n = $n * 26 + ([int]$c - 64) }; $n - 1 }
$rows = @()
foreach ($r in $sh.worksheet.sheetData.row) {
  $vals = @{}
  foreach ($c in $r.c) {
    $v = $c.v; if ($c.t -eq 's') { $v = $strings[[int]$v] } elseif ($c.t -eq 'inlineStr') { $v = $c.is.t }
    $vals[(ColIdx $c.r)] = $v
  }
  $max = ($vals.Keys | Measure-Object -Maximum).Maximum
  $rows += ,(@(0..$max | ForEach-Object { $vals[$_] }))
}
$zip.Dispose()
$hdr = $rows[0]; "header: $($hdr -join ' | ')"
$si = [Array]::IndexOf($hdr, ($hdr | Where-Object { $_ -match '^(state_alpha|stusps|State_Alpha)$' } | Select-Object -First 1))
"state col: $si"
$out = @(($hdr | ForEach-Object { '"' + $_ + '"' }) -join ',')
foreach ($row in $rows[1..($rows.Count - 1)]) { if ($row[$si] -eq 'OR' -or $row[$si] -eq 'WA') { $out += (($row | ForEach-Object { '"' + $_ + '"' }) -join ',') } }
[IO.File]::WriteAllLines($OutCsv, $out)
"rows written: $($out.Count - 1)"
