#!/usr/bin/perl

=pod
Functions:
- Run all tests
	./run_rtest.pl all
	(equal to call: phpunit rtest.php)

- Run just one or several cases, it analyzes the dependencies and run them by correct order 
	./run_rtest.pl case1 case2
	(equal to call: phpunit --filter "case1_dep|case2_dep|case1|case2" rtest.php)

=cut

use strict;
use warnings;

if (@ARGV == 0) {
	print(q/
run_rtest all
  -- run all regression tests
run_rtest testcase1
  -- run testcase1 (with its dependencies)
run_rtest testcase1 testcase2 ...
  -- run testcase1 and testcase2 (with their dependencies)
/);
	exit;
}

if (exists($ENV{SVC_URL})) {
	print "=== SVC_URL=$ENV{SVC_URL}\n";
}

undef $ENV{P_APP};

my $cmd;
if ($ARGV[0] eq 'all') {
	$cmd = "phpunit rtest.php";
	system($cmd);
	exit;
}

=pod
analyze case dependencies by parsing rtest.php:

class XXX
{
	function test1() {}
	/**
	 * @depends test1
	 */
	function test2() {}

	/**
	 * @depends test1
	 * @depends test2
	 */
	function test3() {}
}

testone.pl test3
->
test2: test1
test3: test1 test2
->
phpunit --filter "test1|test2|test3" rtest.php

=cut

open I, "rtest.php" or die "*** cannot find rtest.php!";

my %alldeps; # elem: $one => \@others
my %allcases; # lc(casename) => casename
my @deps;
while (<I>) {
	if (/\@depends\s+(\w+)/) {
		push @deps, $1;
	}
	elsif (/^\s*function\s+(test\w+)/) {
		my $case = $1;
		$allcases{lc($case)} = $case;
		if (@deps) {
			$alldeps{$case} = [];
			@{$alldeps{$case}} = @deps;
			@deps = ();
		}
	}
}
close I;

sub getDep # ($case, \@resutl)
{
	my ($case, $result) = @_;
	if (exists($alldeps{$case})) {
		for (@{$alldeps{$case}}) {
			getDep($_, $result);
		}
	}
	unless (grep {$_ eq $case} @$result)
	{
		push @$result, $case;
	}
}

=pod
# show deps
while (@_ = each %alldeps) {
	print "$_[0] => ";
	for (@{$_[1]}) {
		print "$_ ";
	}
	print "\n";
}
=cut

my @res;
foreach (@ARGV) {
	my $case = $allcases{lc($_)};
	if (!defined $case) {
		print "*** cannot find case: $_!\n";
		s/test//;
		foreach $case (values(%allcases)) {
			if ($case =~ /$_/i) {
				print "  $case\n";
			}
		}
		exit();
	}
	getDep($case, \@res);
}

$cmd = "phpunit --filter \"/(" . join('|', @res) . ")\$/\" rtest.php";
print "=== Run: $cmd\n";
system($cmd);
