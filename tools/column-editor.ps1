Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
[System.Windows.Forms.Application]::EnableVisualStyles()

$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$utf8 = New-Object Text.UTF8Encoding($false)
$script:lastArticle = ''

function Enc([string]$s) { [Net.WebUtility]::HtmlEncode($s) }
function WriteUtf8([string]$path, [string]$value) { [IO.File]::WriteAllText($path, $value, $utf8) }
function Slug([string]$s) {
  $v = [regex]::Replace($s.Trim().ToLowerInvariant(), '[^a-z0-9-]+', '-')
  $v = [regex]::Replace($v, '-+', '-').Trim('-')
  if (!$v) { $v = 'column-' + (Get-Date -Format 'yyyyMMdd-HHmmss') }
  $v
}
function Category([string]$label) {
  switch ($label) {
    '집중' { @{code='Focus'; en='FOCUS'} }
    '마음' { @{code='Calm'; en='CALM'} }
    '채움' { @{code='Restore'; en='RESTORE'} }
    '불편' { @{code='Relief'; en='RELIEF'} }
    default { @{code='Shape'; en='SHAPE'} }
  }
}
function BodyHtml([string]$text) {
  $out = @()
  foreach ($block in [regex]::Split($text.Trim(), '(\r?\n){2,}')) {
    $v = $block.Trim()
    if (!$v) { continue }
    if ($v.StartsWith('## ')) { $out += '<h2>' + (Enc $v.Substring(3)) + '</h2>' }
    elseif ($v.StartsWith('### ')) { $out += '<h3>' + (Enc $v.Substring(4)) + '</h3>' }
    else { $out += '<p>' + ((Enc $v) -replace '(\r?\n)', '<br>') + '</p>' }
  }
  $out -join "`r`n"
}
function FaqItems([string]$text) {
  $items = @()
  foreach ($line in ($text -split '\r?\n')) {
    $parts = $line.Split('|', 2)
    if ($parts.Count -eq 2 -and $parts[0].Trim() -and $parts[1].Trim()) {
      $items += [pscustomobject]@{q=$parts[0].Trim(); a=$parts[1].Trim()}
    }
  }
  $items
}

function Generate {
  if (!$title.Text.Trim() -or !$summary.Text.Trim() -or !$body.Text.Trim()) { throw '제목, 요약, 본문은 반드시 입력해 주세요.' }
  if (!(Test-Path -LiteralPath $image.Text -PathType Leaf)) { throw '대표 사진을 선택해 주세요.' }
  $id = Slug $slug.Text
  $cat = Category $category.SelectedItem
  $iso = $date.Value.ToString('yyyy-MM-dd')
  $display = $date.Value.ToString('yyyy.MM.dd')
  $article = Join-Path $root "columns\$id.html"
  if ((Test-Path $article) -and $script:lastArticle -ne $article) { throw '같은 URL의 칼럼이 이미 있습니다. 영문 URL을 바꿔 주세요.' }
  $ext = [IO.Path]::GetExtension($image.Text).ToLowerInvariant()
  if ($ext -notin @('.jpg','.jpeg','.png','.webp')) { throw 'JPG, PNG 또는 WebP 사진만 사용할 수 있습니다.' }
  $imgName = "$id$ext"
  New-Item -ItemType Directory -Force (Join-Path $root 'columns'),(Join-Path $root 'content\columns'),(Join-Path $root 'assets\images\columns') | Out-Null
  Copy-Item -LiteralPath $image.Text -Destination (Join-Path $root "assets\images\columns\$imgName") -Force

  $faqs = @(FaqItems $faq.Text)
  $faqHtml = ''
  $faqSchema = @()
  if ($faqs.Count) {
    $details = @()
    foreach ($f in $faqs) {
      $details += "<details><summary>$(Enc $f.q)</summary><p>$(Enc $f.a)</p></details>"
      $faqSchema += @{'@type'='Question';name=$f.q;acceptedAnswer=@{'@type'='Answer';text=$f.a}}
    }
    $faqHtml = "<section id=`"faq`" class=`"column-faq`"><p class=`"column-section-label`">FAQ</p><h2>자주 묻는 질문</h2>$($details -join '')</section>"
  }
  $graph = @(
    @{'@type'='Article';headline=$title.Text;description=$summary.Text;image="https://dearhani.com/assets/images/columns/$imgName";datePublished=$iso;dateModified=$iso;author=@{'@type'='Person';name='김민지'};publisher=@{'@type'='MedicalClinic';name='디어한의원';telephone='02-3486-1777';address=@{'@type'='PostalAddress';streetAddress='사임당로 143 3층 309호, 310호';addressLocality='서초구';addressRegion='서울';addressCountry='KR'}}},
    @{'@type'='BreadcrumbList';itemListElement=@(@{'@type'='ListItem';position=1;name='홈';item='https://dearhani.com/'},@{'@type'='ListItem';position=2;name='Columns';item='https://dearhani.com/columns.html'},@{'@type'='ListItem';position=3;name=$title.Text})}
  )
  if ($faqs.Count) { $graph += @{'@type'='FAQPage';mainEntity=$faqSchema} }
  $schema = @{'@context'='https://schema.org';'@graph'=$graph} | ConvertTo-Json -Depth 12 -Compress
  $t = Enc $title.Text
  $s = Enc $summary.Text
  $b = BodyHtml $body.Text
  $html = @"
<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="../assets/images/dear-favicon.png" type="image/png"><title>$t</title><meta name="description" content="$s">
<link rel="canonical" href="https://dearhani.com/columns/$id.html"><meta property="og:type" content="article"><meta property="og:title" content="$t"><meta property="og:description" content="$s"><meta property="og:image" content="https://dearhani.com/assets/images/columns/$imgName">
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.css"><link rel="stylesheet" href="../css/style.css"><script type="application/ld+json">$schema</script></head>
<body class="column-article-body"><nav class="nav" id="top"><a href="../index.html" class="nav__logo">DEAR</a><button class="nav__toggle" id="navToggle" aria-label="메뉴 열기"><span></span><span></span><span></span></button><ul class="nav__menu" id="navMenu"><li><a href="../about.html" class="nav__link">About DEAR</a></li><li><a href="../columns.html" class="nav__link is-active">Columns</a></li><li><a href="../care.html" class="nav__link">Care</a></li><li><a href="../services.html" class="nav__link">DEAR SERVICES</a></li><li><a href="../index.html#info" class="nav__link">Contact</a></li></ul></nav>
<main class="column-article"><article><header class="column-article__header"><nav class="column-breadcrumb"><a href="../index.html">홈</a><span>›</span><a href="../columns.html">Columns</a><span>›</span><span>$(Enc $category.SelectedItem)</span></nav><p class="column-meta">$($cat.en) · $(Enc $category.SelectedItem)</p><h1>$t</h1><p class="column-article__lead">$s</p><div class="column-byline"><span>김민지 대표원장</span><time datetime="$iso">$display</time></div></header>
<figure class="column-article__hero"><img src="../assets/images/columns/$imgName" alt=""></figure><div class="column-article__layout"><aside class="column-toc"><p>DEAR COLUMN</p><a href="../columns.html">다른 칼럼 보기 →</a></aside><div class="column-article__content">$b
<section class="column-consult"><p class="column-section-label">CONSULTATION</p><h2>현재의 상태를<br>함께 살펴보고 싶다면</h2><p>불편함과 생활의 변화를 편하게 이야기해 주세요.<br>진찰을 통해 확인이 필요한 부분과 가능한 방향을 설명해 드립니다.</p><a href="https://m.booking.naver.com/booking/13/bizes/729883" target="_blank" rel="noopener">네이버 진료 예약 →</a></section>$faqHtml
<section class="column-sources"><p>이 글은 일반적인 건강 정보를 제공하기 위한 것으로 개인의 진단이나 치료를 대신하지 않습니다. 증상과 건강 상태에 따라 진찰이 필요할 수 있습니다.</p></section>
<section class="column-nap"><p class="column-section-label">DEAR KOREAN MEDICINE CLINIC</p><h2>디어한의원</h2><address>대표자 김민지 · 사업자등록번호 828-09-02466<br>서울 서초구 사임당로 143 3층 309호, 310호<br><a href="tel:02-3486-1777">02-3486-1777</a></address></section></div></div></article></main>
<footer class="footer" id="contact">
  <div class="footer__inner">
    <div class="footer__top">
      <div class="footer__brand">
        <img class="footer__logo-img" src="../assets/images/logo-full-white.png" alt="디어한의원 로고" width="84" height="140" loading="lazy">
        <p class="footer__slogan">ALWAYS "DEAR" YOU</p>
      </div>
      <div class="footer__sns">
        <a href="https://www.instagram.com/dearhani__/" target="_blank" rel="noopener" aria-label="인스타그램" title="인스타그램">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4.5"/><circle cx="12" cy="12" r="4"/><circle cx="16.2" cy="7.8" r="0.9" fill="currentColor" stroke="none"/></svg>
        </a>
        <a href="https://blog.naver.com/thisisdear" target="_blank" rel="noopener" aria-label="블로그" title="블로그">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3.5" width="14" height="17" rx="1.5"/><path d="M8.5 8h7M8.5 11.5h7M8.5 15h4.5"/></svg>
        </a>
        <a href="https://talk.naver.com/ct/w5zr5u" target="_blank" rel="noopener" aria-label="네이버 톡톡" title="네이버 톡톡">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 1 1 3.3 6.4L4 20l1.2-3.6A7.9 7.9 0 0 1 4 12z"/></svg>
        </a>
      </div>
    </div>

    <div class="footer__nap-row">
      <address class="footer__nap">
        디어한의원 · 대표자 김민지 · 사업자등록번호 828-09-02466<br>
        서울 서초구 사임당로 143 3층 309호, 310호<br>
        <a href="tel:02-3486-1777">02-3486-1777</a>
      </address>
      <div class="footer__legal-links">
        <a href="../privacy.html">개인정보처리방침</a>
        <a href="../non-covered.html">비급여항목 안내</a>
        <a href="../patient-rights.html">환자의 권리와 의무</a>
      </div>
    </div>

    <p class="footer__copyright">COPYRIGHT &copy; 2022 DEAR CLINIC. ALL RIGHTS RESERVED.</p>
  </div>
</footer>
<script src="../js/main.js"></script></body></html>
"@
  WriteUtf8 $article $html
  $meta = [ordered]@{title=$title.Text;slug=$id;category=$cat.code;categoryLabel=$category.SelectedItem;description=$summary.Text;image="assets/images/columns/$imgName";publishedAt=$iso;body=$body.Text;faq=$faqs}
  WriteUtf8 (Join-Path $root "content\columns\$id.json") ($meta | ConvertTo-Json -Depth 8)

  $indexPath = Join-Path $root 'columns.html'
  $index = [IO.File]::ReadAllText($indexPath,[Text.Encoding]::UTF8)
  if (!$index.Contains("data-column-slug=`"$id`"")) {
    $search = Enc "$($title.Text) $($summary.Text) $($category.SelectedItem) $($cat.code)"
    $card = "        <a class=`"column-card js-reveal`" href=`"columns/$id.html`" data-column-slug=`"$id`" data-category=`"$($cat.code)`" data-search=`"$search`"><div class=`"column-card__image`"><img src=`"assets/images/columns/$imgName`" alt=`"`" loading=`"lazy`"></div><p class=`"column-meta`">$($cat.en) · $(Enc $category.SelectedItem)</p><h2>$t</h2><p>$s</p><time datetime=`"$iso`">$display</time></a>`r`n        <!-- COLUMN_CARDS_END -->"
    WriteUtf8 $indexPath $index.Replace('        <!-- COLUMN_CARDS_END -->',$card)
  }
  $mapPath = Join-Path $root 'sitemap.xml'
  $map = [IO.File]::ReadAllText($mapPath,[Text.Encoding]::UTF8)
  if (!$map.Contains("/columns/$id.html")) {
    $entry = "  <url><loc>https://dearhani.com/columns/$id.html</loc><lastmod>$iso</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>`r`n  <!-- COLUMN_SITEMAP_END -->"
    WriteUtf8 $mapPath $map.Replace('  <!-- COLUMN_SITEMAP_END -->',$entry)
  }
  $slug.Text = $id
  $script:lastArticle = $article
  $article
}

$form = New-Object Windows.Forms.Form
$form.Text='디어한의원 칼럼 작성기'; $form.Size=New-Object Drawing.Size(1040,820); $form.MinimumSize=New-Object Drawing.Size(900,720); $form.StartPosition='CenterScreen'; $form.BackColor=[Drawing.Color]::FromArgb(248,248,246); $form.Font=New-Object Drawing.Font('Malgun Gothic',10)
function Label($text,$x,$y,$w=440) { $c=New-Object Windows.Forms.Label; $c.Text=$text; $c.SetBounds($x,$y,$w,24); $form.Controls.Add($c) }
function Box($x,$y,$w,$h=32,$multi=$false) { $c=New-Object Windows.Forms.TextBox; $c.SetBounds($x,$y,$w,$h); $c.Multiline=$multi; if($multi){$c.ScrollBars='Vertical';$c.AcceptsReturn=$true}; $form.Controls.Add($c); $c }
$head=New-Object Windows.Forms.Label; $head.Text='DEAR COLUMN EDITOR';$head.Font=New-Object Drawing.Font('Malgun Gothic',19,[Drawing.FontStyle]::Bold);$head.ForeColor=[Drawing.Color]::FromArgb(36,120,96);$head.SetBounds(30,20,600,42);$form.Controls.Add($head)
Label '제목 *' 32 92; $title=Box 32 118 940
Label '영문 URL (예: summer-insomnia / 비우면 자동)' 32 162; $slug=Box 32 188 440
Label '분류 *' 500 162; $category=New-Object Windows.Forms.ComboBox;$category.SetBounds(500,188,220,32);$category.DropDownStyle='DropDownList';[void]$category.Items.AddRange(@('집중','마음','채움','불편','변화'));$category.SelectedItem='변화';$form.Controls.Add($category)
Label '게시일 *' 750 162; $date=New-Object Windows.Forms.DateTimePicker;$date.SetBounds(750,188,222,32);$date.Format='Short';$form.Controls.Add($date)
Label '목록 요약 * (두 문장 이내)' 32 236; $summary=Box 32 262 940 64 $true
Label '본문 * (문단 사이 한 줄 비우기 / 중간 제목은 ## 제목)' 32 340 610; $body=Box 32 366 610 236 $true
Label 'FAQ (질문 | 답변)' 670 340 300; $faq=Box 670 366 302 236 $true
Label '대표 사진 * (가로 4:3 권장)' 32 618 700; $image=Box 32 644 760
$browse=New-Object Windows.Forms.Button;$browse.Text='사진 선택';$browse.SetBounds(810,642,162,36);$form.Controls.Add($browse)
$preview=New-Object Windows.Forms.Button;$preview.Text='저장 및 미리보기';$preview.SetBounds(500,700,220,44);$form.Controls.Add($preview)
$publish=New-Object Windows.Forms.Button;$publish.Text='GitHub에 게시';$publish.SetBounds(738,700,234,44);$publish.BackColor=[Drawing.Color]::FromArgb(36,120,96);$publish.ForeColor=[Drawing.Color]::White;$form.Controls.Add($publish)
$browse.Add_Click({$d=New-Object Windows.Forms.OpenFileDialog;$d.Filter='이미지|*.jpg;*.jpeg;*.png;*.webp';if($d.ShowDialog()-eq'OK'){$image.Text=$d.FileName}})
$preview.Add_Click({try{$a=Generate;Start-Process $a;[Windows.Forms.MessageBox]::Show("저장했습니다.`n브라우저에서 확인한 뒤 게시 버튼을 누르세요.",'완료')|Out-Null}catch{[Windows.Forms.MessageBox]::Show($_.Exception.Message,'확인','OK','Warning')|Out-Null}})
$publish.Add_Click({
  try {
    $a=Generate
    if([Windows.Forms.MessageBox]::Show('GitHub에 게시할까요?','게시 확인','YesNo','Question')-ne'Yes'){return}
    Push-Location $root
    & git add -- columns.html sitemap.xml columns content/columns assets/images/columns
    if($LASTEXITCODE){throw 'Git 저장 준비에 실패했습니다.'}
    & git commit -m "칼럼 게시: $($title.Text)"
    if($LASTEXITCODE){throw '커밋하지 못했습니다. 이미 게시한 글인지 확인해 주세요.'}
    & git push origin master
    if($LASTEXITCODE){throw "GitHub 전송에 실패했습니다.`nPowerShell에서 git push origin master를 실행해 주세요."}
    [Windows.Forms.MessageBox]::Show('게시했습니다. 약 1~3분 뒤 확인해 주세요.','게시 완료')|Out-Null
  } catch {[Windows.Forms.MessageBox]::Show($_.Exception.Message,'게시 실패','OK','Error')|Out-Null}
  finally {if((Get-Location).Path -ne $root){Pop-Location}}
})
[void]$form.ShowDialog()
