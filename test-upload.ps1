# PowerShell脚本测试ComfyUI上传
$url = "https://w47dwct9xg-8188.cnb.run/upload/image"

Write-Host "测试ComfyUI上传接口..." -ForegroundColor Green

# 创建一个简单的测试图片文件
$testImageData = [System.Convert]::FromBase64String("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==")
$testImagePath = "test-image.png"
[System.IO.File]::WriteAllBytes($testImagePath, $testImageData)

Write-Host "创建了测试图片: $testImagePath" -ForegroundColor Yellow

try {
    # 使用Invoke-RestMethod测试上传
    $form = @{
        image = Get-Item $testImagePath
        type = "input"
        subfolder = ""
        overwrite = "false"
    }
    
    Write-Host "发送上传请求到: $url" -ForegroundColor Yellow
    
    $response = Invoke-RestMethod -Uri $url -Method Post -Form $form -Verbose
    
    Write-Host "上传成功!" -ForegroundColor Green
    Write-Host "响应: $($response | ConvertTo-Json)" -ForegroundColor Cyan
    
} catch {
    Write-Host "上传失败!" -ForegroundColor Red
    Write-Host "错误: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "详细错误: $($_.Exception)" -ForegroundColor Red
} finally {
    # 清理测试文件
    if (Test-Path $testImagePath) {
        Remove-Item $testImagePath
        Write-Host "清理了测试文件" -ForegroundColor Yellow
    }
}

Write-Host "测试完成" -ForegroundColor Green
