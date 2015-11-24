#!/bin/perl

use strict;
use warnings;
use File::Basename;

my %newdirs = ();
my ($srcdir, $dstdir) = @ARGV;
if (!$srcdir || !$dstdir) {
	print "Usage: gencmd {srcdir} {dstdir}\n";
	exit(-1);
}
open OUT, ">:raw:encoding(gb2312)", "tmp.sh";
print OUT "#/bin/sh\n";

open IN, "<:utf8", "FILE_LIST.txt" or die "file FILE_LIST.txt";
while (<IN>) {
	s/\s+$//s;
	next if /^\s*$/ or /^#/;
	if (/\*$/) {
		chop;
		next if -f "$dstdir/$_";
	}
	my $d = dirname("$dstdir/$_");
	do {
		print OUT "mkdir -p \"$d\"\n";
		$newdirs{$d} = 1;
	} unless exists($newdirs{$d}) || -d $d;
	print OUT "cp \"$srcdir/$_\" \"$dstdir/$_\"\n";
}
close IN;
close OUT;

system("sh tmp.sh");
