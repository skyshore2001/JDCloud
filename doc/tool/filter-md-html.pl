#!/bin/perl
use strict;
use warnings;

=pod

处理pandoc生成的html。用法：

	pandoc foo.md | filter-md-html.pl

一般用md生成html文档用：

	pandoc --toc -N -s 1.md 

但它不满足需求，因此用本工具进行后期处理。

- 第一个h1作为文档标题。（pandoc只能用%title来表示标题）

		<h1 id="doc-title">doc title</h1>

- 从h2标题开始生成编号。（pandoc生成编号必须从h1开始。pandoc -N）

		<h2 id="title-1">title 1</h2>
		<h3 id="title-1.1">title 1.1</h3>
		<h3 id="title-1.2">title 1.2</h3>

- 生成目录，目录放置在正文之前，即第1个h2之前。（pandoc生成的目录位置不可调。pandoc --toc）
- 引用style.css
- 添加todo类

=cut

my %g_opt = (
	titleNoFrom => 2
);

my $g_docTitle;
my @g_toc; # elem: {title, @children?, parent}
my ($body1, $tocContent, $body2);

# generate title no
my @stack = (); # {level,no}

my $flag = 0;
while (<>) {
	s/^<h(\d+) id="(.*?)">\K(?=(.*?)<)/genNo($1, $3, $2)/e;
	if ($flag == 0 && $1 == 2) {
		$flag = 1;
	}
	s/<(\w+)>(?=todo:)/<$1 class="todo">/i;

	if ($flag == 0) {
		$body1 .= $_;
	}
	else {
		$body2 .= $_;
	}
}

print <<EOL;
<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
  <title>$g_docTitle</title>
  <style type="text/css">code{white-space: pre;}</style>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
$body1
EOL

print "<div id=\"TOC\" class=\"toc\">\n<ul>\n";
for (@g_toc) {
	showToc($_);
}
print "</ul></div>\n\n";

print <<EOL;
$body2
</body>
</html>
EOL

sub showToc # toc
{
	my ($toc) = @_;
	print "<li>$_->{title}";
	if (@{$_->{children}} > 0) {
		print "<ul>\n";
		for (@{$_->{children}}) {
			showToc($_);
		}
		print "</ul>";
	}
	print "</li>\n";
}

# 生成编号；生成目录toc;
sub genNo # ($level, $title, $id)
{
	my ($level, $title, $id) = @_;
	#print ">>>$title<<<\n";

	if (!$g_docTitle && ($level == 1)) {
		$g_docTitle = $title;
	}

	my $tocItem = { title => undef, children => [] };
	while (@stack > 0 && $stack[-1]{level} > $level) {
		pop @stack;
	}
	if (@stack == 0 || $stack[-1]{level} < $level) {
		push @stack, {level => $level, no => 1, toc => $tocItem};
	}
	else {
		++ $stack[-1]->{no};
		$stack[-1]->{toc} = $tocItem;
	}
	if (@stack > 1) {
		push @{$stack[-2]{toc}{children}}, $tocItem;
	}
	else {
		push @g_toc, $tocItem;
	}
	my $no = join(".", map { $_->{no} } grep { $_->{level} >= $g_opt{titleNoFrom} } @stack);

	my $tag = "";
	my $tagToc = "";
	if ($no) {
		$tag = "<span class=\"header-section-number\">$no</span> ";
		$tagToc = "<span class=\"toc-section-number\">$no</span> ";
	}
	$tocItem->{title} = "<a href=\"#$id\">${tagToc}$title</a>";
	$tag;
}

