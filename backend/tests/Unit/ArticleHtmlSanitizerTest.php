<?php

namespace Tests\Unit;

use App\Support\ArticleHtmlSanitizer;
use PHPUnit\Framework\TestCase;

class ArticleHtmlSanitizerTest extends TestCase
{
    public function test_removes_script_tags_and_event_handler_attributes(): void
    {
        $html = <<<'HTML'
<p onclick="alert(1)">Teks aman</p>
<script>alert('xss')</script>
<img src="https://example.com/photo.jpg" onerror="alert(1)">
HTML;

        $result = ArticleHtmlSanitizer::sanitize($html);

        $this->assertStringContainsString('Teks aman', $result);
        $this->assertStringNotContainsString('<script', strtolower($result));
        $this->assertStringNotContainsString('onclick', strtolower($result));
        $this->assertStringNotContainsString('onerror', strtolower($result));
    }

    public function test_removes_javascript_urls(): void
    {
        $html = <<<'HTML'
<a href="javascript:alert(1)">Klik di sini</a>
<img src="javascript:alert(1)" alt="gambar">
HTML;

        $result = ArticleHtmlSanitizer::sanitize($html);

        $this->assertStringNotContainsString('javascript:', strtolower($result));
        $this->assertStringNotContainsString('alert(1)', strtolower($result));
    }

    public function test_removes_iframe_and_embedded_content(): void
    {
        $html = <<<'HTML'
<p>Konten artikel</p>
<iframe src="https://example.com"></iframe>
<object data="https://example.com"></object>
<embed src="https://example.com">
HTML;

        $result = ArticleHtmlSanitizer::sanitize($html);
        $lower = strtolower($result);

        $this->assertStringContainsString('Konten artikel', $result);
        $this->assertStringNotContainsString('<iframe', $lower);
        $this->assertStringNotContainsString('<object', $lower);
        $this->assertStringNotContainsString('<embed', $lower);
    }

    public function test_preserves_supported_safe_rich_text_content(): void
    {
        $html = <<<'HTML'
<h2>Judul artikel</h2>
<p><strong>Teks tebal</strong> dan <em>teks miring</em>.</p>
<ul><li>Butir pertama</li><li>Butir kedua</li></ul>
<a href="https://example.com" title="Situs contoh">Situs contoh</a>
<img src="https://example.com/photo.jpg" alt="Foto artikel">
HTML;

        $result = ArticleHtmlSanitizer::sanitize($html);

        $this->assertStringContainsString('<h2>', $result);
        $this->assertStringContainsString('<strong>', $result);
        $this->assertStringContainsString('<em>', $result);
        $this->assertStringContainsString('<ul>', $result);
        $this->assertStringContainsString('<li>', $result);
        $this->assertStringContainsString('https://example.com', $result);
        $this->assertStringContainsString('alt="Foto artikel"', $result);
    }
}
