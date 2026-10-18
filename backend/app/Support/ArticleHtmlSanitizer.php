<?php

namespace App\Support;

use HTMLPurifier;
use HTMLPurifier_Config;

final class ArticleHtmlSanitizer
{
    public static function sanitize(string $html): string
    {
        $config = HTMLPurifier_Config::createDefault();

        $config->set(
            'HTML.Allowed',
            'p,br,hr,h1,h2,h3,h4,h5,h6,' .
            'strong,b,em,i,u,s,ul,ol,li,' .
            'blockquote,pre,code,a[href|title|target|rel],' .
            'img[src|alt|title|width|height],' .
            'figure,figcaption,' .
            'table,thead,tbody,tr,th[colspan|rowspan],td[colspan|rowspan],' .
            'sub,sup'
        );

        $config->set('URI.AllowedSchemes', [
            'http' => true,
            'https' => true,
            'mailto' => true,
            'tel' => true,
        ]);

        $config->set('HTML.SafeIframe', false);
        $config->set('Attr.EnableID', false);

        $purifier = new HTMLPurifier($config);

        return $purifier->purify($html);
    }
}
