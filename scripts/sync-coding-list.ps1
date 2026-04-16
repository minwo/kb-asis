param(
    [string]$Root = "."
)

$rootPath = (Resolve-Path $Root).Path
$metaPath = Join-Path $rootPath "coding-list.meta.json"
$codingListPath = Join-Path $rootPath "coding-list.html"

if (-not (Test-Path $metaPath)) {
    throw "Missing metadata file: $metaPath"
}

$meta = Get-Content -Raw -Encoding UTF8 $metaPath | ConvertFrom-Json
$htmlFiles = Get-ChildItem -Path $rootPath -Filter *.html -File |
    Where-Object { $_.Name -ne "coding-list.html" } |
    Sort-Object Name -Descending

$ignoreFiles = @()
foreach ($property in $meta.PSObject.Properties) {
    if ($property.Name -eq "_ignore") {
        $ignoreFiles = @($property.Value)
    }
}

$htmlFiles = $htmlFiles | Where-Object { $ignoreFiles -notcontains $_.Name }

function Get-MetaItem {
    param(
        [object]$MetaObject,
        [string]$FileName
    )

    foreach ($property in $MetaObject.PSObject.Properties) {
        if ($property.Name -eq $FileName) {
            return $property.Value
        }
    }

    return $null
}

function Get-MetaValue {
    param(
        [object]$MetaItem,
        [string]$PropertyName
    )

    if ($null -eq $MetaItem) {
        return $null
    }

    foreach ($property in $MetaItem.PSObject.Properties) {
        if ($property.Name -eq $PropertyName) {
            return $property.Value
        }
    }

    return $null
}

function Get-DefaultDescription {
    param(
        [string]$FileName,
        [string]$Name
    )

    if ($FileName -match "P_") {
        return "$Name 팝업"
    }

    return "$Name 페이지"
}

$index = 1
$rows = foreach ($file in $htmlFiles) {
    $fileText = Get-Content -Raw -Encoding UTF8 $file.FullName
    $titleMatch = [regex]::Match(
        $fileText,
        "<title>(.*?)</title>",
        [System.Text.RegularExpressions.RegexOptions]::Singleline -bor
        [System.Text.RegularExpressions.RegexOptions]::IgnoreCase
    )

    $title = if ($titleMatch.Success) { $titleMatch.Groups[1].Value.Trim() } else { [System.IO.Path]::GetFileNameWithoutExtension($file.Name) }
    $itemMeta = Get-MetaItem -MetaObject $meta -FileName $file.Name
    $name = Get-MetaValue -MetaItem $itemMeta -PropertyName "name"
    if (-not $name) { $name = $title }

    $description = Get-MetaValue -MetaItem $itemMeta -PropertyName "description"
    if (-not $description) { $description = Get-DefaultDescription -FileName $file.Name -Name $name }

    $status = Get-MetaValue -MetaItem $itemMeta -PropertyName "status"
    if (-not $status) { $status = "complete" }

    $dueDate = Get-MetaValue -MetaItem $itemMeta -PropertyName "dueDate"
    if (-not $dueDate) { $dueDate = (Get-Date).ToString("yyyy-MM-dd") }

    $statusText = switch ($status) {
        "progress" { "진행중" }
        "pending" { "대기" }
        default { "완료" }
    }

    $statusClass = switch ($status) {
        "progress" { "status-progress" }
        "pending" { "status-pending" }
        default { "status-complete" }
    }

@"
				<tr>
					<td>$index</td>
					<td><a href="$($file.Name)" target="_blank" class="file-link"
							data-preview="$($file.Name)">$name</a></td>
					<td>$description</td>
					<td>-</td>
					<td><span class="status-badge $statusClass">$statusText</span></td>
					<td>$dueDate</td>
				</tr>
"@
    $index++
}

$tableRows = ($rows -join "`r`n")

$html = @"
<!DOCTYPE html>
<html lang="ko">

<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>코딩리스트</title>
	<link rel="stylesheet" href="assets/css/reset.css">
	<link rel="stylesheet" href="assets/css/comn-form.css">
	<style>
		.coding-list-container {
			max-width: 1200px;
			margin: 0 auto;
			padding: 30px 20px;
		}

		.list-header {
			margin-bottom: 30px;
		}

		.list-header h1 {
			font-size: 28px;
			font-weight: 700;
			margin-bottom: 10px;
		}

		.quick-links {
			display: flex;
			gap: 8px;
			margin-top: 16px;
		}

		.quick-link {
			display: inline-flex;
			align-items: center;
			justify-content: center;
			min-height: 44px;
			padding: 0 18px;
			border-radius: 12px;
			font-size: 15px;
			font-weight: 700;
			color: #111;
			text-decoration: none;
			background: #ffde33;
		}

		.quick-link:hover {
			text-decoration: none;
			background: #ffd400;
		}

		.list-table {
			width: 100%;
			border-collapse: collapse;
			background-color: #fff;
		}

		.list-table thead {
			background-color: #f5f5f5;
		}

		.list-table th,
		.list-table td {
			padding: 15px;
			text-align: left;
			border-bottom: 1px solid #ddd;
		}

		.list-table th {
			font-weight: 600;
			color: #333;
		}

		.list-table tbody tr:hover {
			background-color: #f9f9f9;
		}

		.status-badge {
			display: inline-block;
			padding: 4px 12px;
			border-radius: 4px;
			font-size: 12px;
			font-weight: 500;
		}

		.status-complete {
			background-color: #e8f5e9;
			color: #2e7d32;
		}

		.status-progress {
			background-color: #fff3e0;
			color: #e65100;
		}

		.status-pending {
			background-color: #f3e5f5;
			color: #6a1b9a;
		}

		.file-link {
			color: #0066cc;
			text-decoration: none;
			cursor: pointer;
		}

		.file-link:hover {
			text-decoration: underline;
		}

		.preview-container {
			display: none;
			position: fixed;
			top: 50%;
			right: 20px;
			transform: translateY(-50%);
			width: 375px;
			height: 600px;
			background: #fff;
			border: 1px solid #ddd;
			border-radius: 8px;
			box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
			z-index: 1000;
			overflow: hidden;
		}

		.preview-container.show {
			display: block;
		}

		.preview-header {
			padding: 12px 16px;
			border-bottom: 1px solid #f0f0f0;
			font-size: 12px;
			color: #666;
			background: #f9f9f9;
		}

		.preview-content {
			width: 100%;
			height: calc(100% - 40px);
			border: none;
		}

		@media (max-width: 1400px) {
			.preview-container {
				display: none !important;
			}
		}
	</style>
</head>

<body>
	<div class="coding-list-container">
		<div class="list-header">
			<h1>코딩리스트</h1>
			<p>프로젝트 개발 항목 목록</p>
			<div class="quick-links">
				<a href="component-collection.html" target="_blank" class="quick-link file-link"
					data-preview="component-collection.html">컴포넌트 컬렉션 바로가기</a>
			</div>
		</div>

		<table class="list-table">
			<thead>
				<tr>
					<th style="width: 60px;">No.</th>
					<th style="width: 200px;">항목명</th>
					<th style="width: 300px;">설명</th>
					<th style="width: 100px;">개발자</th>
					<th style="width: 80px;">상태</th>
					<th style="width: 100px;">예정일</th>
				</tr>
			</thead>
			<tbody>
$tableRows
			</tbody>
		</table>
	</div>

	<div class="preview-container" id="previewContainer">
		<div class="preview-header">미리보기</div>
		<iframe class="preview-content" id="previewFrame"></iframe>
	</div>

	<script>
		document.addEventListener('DOMContentLoaded', function () {
			const links = document.querySelectorAll('.file-link[data-preview]');
			const previewContainer = document.getElementById('previewContainer');
			const previewFrame = document.getElementById('previewFrame');

			links.forEach(link => {
				link.addEventListener('mouseenter', function () {
					const previewUrl = this.getAttribute('data-preview');
					previewFrame.src = previewUrl;
					previewContainer.classList.add('show');
				});

				link.addEventListener('mouseleave', function () {
					previewContainer.classList.remove('show');
					previewFrame.src = '';
				});
			});
		});
	</script>
</body>

</html>
"@

[System.IO.File]::WriteAllText($codingListPath, $html, [System.Text.UTF8Encoding]::new($false))
