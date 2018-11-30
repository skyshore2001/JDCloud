#!/bin/perl
=pod
本工具根据主设计文档DESIGN.md，生成表格形式数据库文档，包括每个表的字段、类型和描述信息。

用法：

	perl genDbDoc.pl ../DESIGN.md > 1.txt

输出文件为制表符分隔的txt文件，可直接拷贝文本到Excel中编辑。

=cut

if (@ARGV == 0) {
	@ARGV = ("../DESIGN.md");
}

while(<>) {
	last if /^## 数据库设计/;
}

my $table = {}; # {name, dscr?, fieldDef, %fieldDscr={name=>dscr}}
my $field;
while(<>) {
	if (/^## 交互接口设计/) {
		&outputTable($table);
		last;
	}

	if (/^\*\*\[(.*?)\]\*\*/) {
		&outputTable($table);
		$table = {
			dscr => $1
		};
	}
	elsif (/^\@(\w+):\s*(.*)/) {
		if ($table->{name}) {
			&outputTable($table);
			$table = {};
		}
		$table->{name} = $1;
		$table->{fieldDef} = $2;
		$table->{fieldDscr} = {};
	}
	elsif (/^(\w\S+)/) {
		$field = $1;
	}
	elsif (/^:\s*(.*)$/) {
		$dscr = $1;
		$dscr =~ s/^(String|Integer|Money|Boolean)\.?\s*//i;
		my @a = split(/[\/,]/, $field);
		if (@a > 1) {
			$dscr = "TODO:$dscr";
		}
		for (@a) {
			$table->{fieldDscr}->{$_} = $dscr;
		}
	}
}

sub outputTable
{
	my ($table) = @_;
	return if !$table->{name};
	print "$table->{name}表\t$table->{dscr}\n";
#	print "字段\t类型\t说明\n";
	for $field (split/\s*,\s*/, $table->{fieldDef}) {
		if ($field eq 'id' || $field =~ /Id$/) {
			$type = "INTEGER";
		}
		elsif ($field =~ s/\((\w+)\)$//) {
			$len = $1;
			if ($len eq 's') {
				$type = "NVARCHAR(20)";
			}
			elsif ($len eq 'l') {
				$type = "NVARCHAR(255)";
			}
			elsif ($len eq 't') {
				$type = "NTEXT";
			}
			else {
				$type = "NVARCHAR($len)";
			}
		}
		elsif ($field =~ s/(@|&|#)$//) {
			if ($1 eq '@') {
				$type = "DECIMAL(19,2)";
			}
			elsif ($1 eq '&') {
				$type = "INTEGER";
			}
			elsif ($1 eq '#') {
				$type = "REAL";
			}
		}
		elsif ($field =~ /(Price|Qty|Total|Amount)$/) {
			$type = "DECIMAL(19,2)";
		}
		elsif ($field =~ /Tm$/) {
			$type = "DATETIME";
		}
		elsif ($field =~ /Dt$/) {
			$type = "DATE";
		}
		elsif ($field =~ /Flag$/) {
			$type = "TINYINT"; # default 0
		}
		elsif ($field =~ /^\w+$/) { # default
			$type = "NVARCHAR(50)";
		}

		if ($table->{fieldDscr} && $table->{fieldDscr}->{$field}) {
			$dscr = $table->{fieldDscr}->{$field};
			delete $table->{fieldDscr}->{$field};
		}
		else {
			$dscr = '';
		}
		print "$field\t$type\t$dscr\n";
	}
	while (@_ = each(%{$table->{fieldDscr}})) {
		print "TODO:'$_[0]'\t\t$_[1]\n";
	}
	print "\n";
}
