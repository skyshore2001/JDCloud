" Vimball Archiver by Charles E. Campbell, Jr., Ph.D.
UseVimball
finish
plugin/vimwiki.vim	[[[1
564
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki plugin file
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/
" GetLatestVimScripts: 2226 1 :AutoInstall: vimwiki

if exists("loaded_vimwiki") || &cp
  finish
endif
let loaded_vimwiki = 1

let s:old_cpo = &cpo
set cpo&vim

" Logging and performance instrumentation "{{{
let g:VimwikiLog = {}
let g:VimwikiLog.path = 0           " # of calls to VimwikiGet with path or path_html
let g:VimwikiLog.path_html = 0      " # of calls to path_html()
let g:VimwikiLog.normalize_path = 0 " # of calls to normalize_path()
let g:VimwikiLog.subdir = 0         " # of calls to vimwiki#base#subdir()
let g:VimwikiLog.timing = []        " various timing measurements
let g:VimwikiLog.html = []          " html conversion timing
function! VimwikiLog_extend(what,...)  "{{{
  call extend(g:VimwikiLog[a:what],a:000)
endfunction "}}}
"}}}

" HELPER functions {{{
function! s:default(varname, value) "{{{
  if !exists('g:vimwiki_'.a:varname)
    let g:vimwiki_{a:varname} = a:value
  endif
endfunction "}}}

function! s:find_wiki(path) "{{{
  " XXX: find_wiki() does not (yet) take into consideration the ext
  let path = vimwiki#u#path_norm(vimwiki#u#chomp_slash(a:path))
  let idx = 0
  while idx < len(g:vimwiki_list)
    let idx_path = expand(VimwikiGet('path', idx))
    let idx_path = vimwiki#u#path_norm(vimwiki#u#chomp_slash(idx_path))
    if vimwiki#u#path_common_pfx(idx_path, path) == idx_path
      return idx
    endif
    let idx += 1
  endwhile
  return -1
  " an orphan page has been detected
endfunction "}}}


function! s:vimwiki_idx() " {{{
  if exists('b:vimwiki_idx')
    return b:vimwiki_idx
  else
    return -1
  endif
endfunction " }}}

function! s:setup_buffer_leave() "{{{
  if g:vimwiki_debug ==3
    echom "Setup_buffer_leave g:curr_idx=".g:vimwiki_current_idx." b:curr_idx=".s:vimwiki_idx().""
  endif
  if &filetype == 'vimwiki'
    " cache global vars of current state XXX: SLOW!?
    call vimwiki#base#cache_buffer_state()
  endif
  if g:vimwiki_debug ==3
    echom "  Setup_buffer_leave g:curr_idx=".g:vimwiki_current_idx." b:curr_idx=".s:vimwiki_idx().""
  endif

  let &autowriteall = s:vimwiki_autowriteall

  " Set up menu
  if g:vimwiki_menu != ""
    exe 'nmenu disable '.g:vimwiki_menu.'.Table'
  endif
endfunction "}}}

function! s:setup_filetype() "{{{
  if g:vimwiki_debug ==3
    echom "Setup_filetype g:curr_idx=".g:vimwiki_current_idx." b:curr_idx=".s:vimwiki_idx().""
  endif
  let time0 = reltime()  " start the clock  "XXX
  " Find what wiki current buffer belongs to.
  let path = expand('%:p:h')
  " XXX: find_wiki() does not (yet) take into consideration the ext
  let idx = s:find_wiki(path)
  if g:vimwiki_debug ==3
    echom "  Setup_filetype g:curr_idx=".g:vimwiki_current_idx." find_idx=".idx." b:curr_idx=".s:vimwiki_idx().""
  endif

  if idx == -1 && g:vimwiki_global_ext == 0
    return
  endif
  "XXX when idx = -1? (an orphan page has been detected)

  "TODO: refactor (same code in setup_buffer_enter)
  " The buffer's file is not in the path and user *does* want his wiki
  " extension(s) to be global -- Add new wiki.
  if idx == -1
    let ext = '.'.expand('%:e')
    " lookup syntax using g:vimwiki_ext2syntax
    if has_key(g:vimwiki_ext2syntax, ext)
      let syn = g:vimwiki_ext2syntax[ext]
    else
      let syn = s:vimwiki_defaults.syntax
    endif
    call add(g:vimwiki_list, {'path': path, 'ext': ext, 'syntax': syn, 'temp': 1})
    let idx = len(g:vimwiki_list) - 1
  endif
  call vimwiki#base#validate_wiki_options(idx)
  " initialize and cache global vars of current state
  call vimwiki#base#setup_buffer_state(idx)
  if g:vimwiki_debug ==3
    echom "  Setup_filetype g:curr_idx=".g:vimwiki_current_idx." (reset_wiki_state) b:curr_idx=".s:vimwiki_idx().""
  endif

  unlet! b:vimwiki_fs_rescan
  set filetype=vimwiki
  if g:vimwiki_debug ==3
    echom "  Setup_filetype g:curr_idx=".g:vimwiki_current_idx." (set ft=vimwiki) b:curr_idx=".s:vimwiki_idx().""
  endif
  let time1 = vimwiki#u#time(time0)  "XXX
  call VimwikiLog_extend('timing',['plugin:setup_filetype:time1',time1])
endfunction "}}}

function! s:setup_buffer_enter() "{{{
  if g:vimwiki_debug ==3
    echom "Setup_buffer_enter g:curr_idx=".g:vimwiki_current_idx." b:curr_idx=".s:vimwiki_idx().""
  endif
  let time0 = reltime()  " start the clock  "XXX
  if !vimwiki#base#recall_buffer_state()
    " Find what wiki current buffer belongs to.
    " If wiki does not exist in g:vimwiki_list -- add new wiki there with
    " buffer's path and ext.
    " Else set g:vimwiki_current_idx to that wiki index.
    let path = expand('%:p:h')
    " XXX: find_wiki() does not (yet) take into consideration the ext
    let idx = s:find_wiki(path)

    if g:vimwiki_debug ==3
      echom "  Setup_buffer_enter g:curr_idx=".g:vimwiki_current_idx." find_idx=".idx." b:curr_idx=".s:vimwiki_idx().""
    endif
    " The buffer's file is not in the path and user *does NOT* want his wiki
    " extension to be global -- Do not add new wiki.
    if idx == -1 && g:vimwiki_global_ext == 0
      return
    endif

    "TODO: refactor (same code in setup_filetype)
    " The buffer's file is not in the path and user *does* want his wiki
    " extension(s) to be global -- Add new wiki.
    if idx == -1
      let ext = '.'.expand('%:e')
      " lookup syntax using g:vimwiki_ext2syntax
      if has_key(g:vimwiki_ext2syntax, ext)
        let syn = g:vimwiki_ext2syntax[ext]
      else
        let syn = s:vimwiki_defaults.syntax
      endif
      call add(g:vimwiki_list, {'path': path, 'ext': ext, 'syntax': syn, 'temp': 1})
      let idx = len(g:vimwiki_list) - 1
    endif
    call vimwiki#base#validate_wiki_options(idx)
    " initialize and cache global vars of current state
    call vimwiki#base#setup_buffer_state(idx)
    if g:vimwiki_debug ==3
      echom "  Setup_buffer_enter g:curr_idx=".g:vimwiki_current_idx." (reset_wiki_state) b:curr_idx=".s:vimwiki_idx().""
    endif

  endif

  " If you have
  "     au GUIEnter * VimwikiIndex
  " Then change it to
  "     au GUIEnter * nested VimwikiIndex
  if &filetype == ''
    set filetype=vimwiki
    if g:vimwiki_debug ==3
      echom "  Setup_buffer_enter g:curr_idx=".g:vimwiki_current_idx." (set ft vimwiki) b:curr_idx=".s:vimwiki_idx().""
    endif
  elseif &syntax == 'vimwiki'
    " to force a rescan of the filesystem which may have changed
    " and update VimwikiLinks syntax group that depends on it;
    " b:vimwiki_fs_rescan indicates that setup_filetype() has not been run
    if exists("b:vimwiki_fs_rescan") && VimwikiGet('maxhi')
      set syntax=vimwiki
      if g:vimwiki_debug ==3
        echom "  Setup_buffer_enter g:curr_idx=".g:vimwiki_current_idx." (set syntax=vimwiki) b:curr_idx=".s:vimwiki_idx().""
      endif
    endif
    let b:vimwiki_fs_rescan = 1
  endif
  let time1 = vimwiki#u#time(time0)  "XXX

  " Settings foldmethod, foldexpr and foldtext are local to window. Thus in a
  " new tab with the same buffer folding is reset to vim defaults. So we
  " insist vimwiki folding here.
  if g:vimwiki_folding == 'expr'
    setlocal fdm=expr
    setlocal foldexpr=VimwikiFoldLevel(v:lnum)
    setlocal foldtext=VimwikiFoldText()
  elseif g:vimwiki_folding == 'list' || g:vimwiki_folding == 'lists'
    setlocal fdm=expr
    setlocal foldexpr=VimwikiFoldListLevel(v:lnum)
    setlocal foldtext=VimwikiFoldText()
  elseif g:vimwiki_folding == 'syntax'
    setlocal fdm=syntax
    setlocal foldtext=VimwikiFoldText()
  endif

  " And conceal level too.
  if g:vimwiki_conceallevel && exists("+conceallevel")
    let &conceallevel = g:vimwiki_conceallevel
  endif

  " Set up menu
  if g:vimwiki_menu != ""
    exe 'nmenu enable '.g:vimwiki_menu.'.Table'
  endif
  "let time2 = vimwiki#u#time(time0)  "XXX
  call VimwikiLog_extend('timing',['plugin:setup_buffer_enter:time1',time1])
endfunction "}}}

function! s:setup_buffer_reenter() "{{{
  if g:vimwiki_debug ==3
    echom "Setup_buffer_reenter g:curr_idx=".g:vimwiki_current_idx." b:curr_idx=".s:vimwiki_idx().""
  endif
  if !vimwiki#base#recall_buffer_state()
    " Do not repeat work of s:setup_buffer_enter() and s:setup_filetype()
    " Once should be enough ...
  endif
  if g:vimwiki_debug ==3
    echom "  Setup_buffer_reenter g:curr_idx=".g:vimwiki_current_idx." b:curr_idx=".s:vimwiki_idx().""
  endif
  if !exists("s:vimwiki_autowriteall")
    let s:vimwiki_autowriteall = &autowriteall
  endif
  let &autowriteall = g:vimwiki_autowriteall
endfunction "}}}

function! s:setup_cleared_syntax() "{{{ highlight groups that get cleared
  " on colorscheme change because they are not linked to Vim-predefined groups
  hi def VimwikiBold term=bold cterm=bold gui=bold
  hi def VimwikiItalic term=italic cterm=italic gui=italic
  hi def VimwikiBoldItalic term=bold cterm=bold gui=bold,italic
  hi def VimwikiUnderline gui=underline
  if g:vimwiki_hl_headers == 1
    for i in range(1,6)
      execute 'hi def VimwikiHeader'.i.' guibg=bg guifg='.g:vimwiki_hcolor_guifg_{&bg}[i-1].' gui=bold ctermfg='.g:vimwiki_hcolor_ctermfg_{&bg}[i-1].' term=bold cterm=bold'
    endfor
  endif
endfunction "}}}

" OPTION get/set functions {{{
" return complete list of options
function! VimwikiGetOptionNames() "{{{
  return keys(s:vimwiki_defaults)
endfunction "}}}

function! VimwikiGetOptions(...) "{{{
  let idx = a:0 == 0 ? g:vimwiki_current_idx : a:1
  let option_dict = {}
  for kk in keys(s:vimwiki_defaults)
    let option_dict[kk] = VimwikiGet(kk, idx)
  endfor
  return option_dict
endfunction "}}}

" Return value of option for current wiki or if second parameter exists for
"   wiki with a given index.
" If the option is not found, it is assumed to have been previously cached in a
"   buffer local dictionary, that acts as a cache.
" If the option is not found in the buffer local dictionary, an error is thrown
function! VimwikiGet(option, ...) "{{{
  let idx = a:0 == 0 ? g:vimwiki_current_idx : a:1

  if has_key(g:vimwiki_list[idx], a:option)
    let val = g:vimwiki_list[idx][a:option]
  elseif has_key(s:vimwiki_defaults, a:option)
    let val = s:vimwiki_defaults[a:option]
    let g:vimwiki_list[idx][a:option] = val
  else
    let val = b:vimwiki_list[a:option]
  endif

  " XXX no call to vimwiki#base here or else the whole autoload/base gets loaded!
  return val
endfunction "}}}

" Set option for current wiki or if third parameter exists for
"   wiki with a given index.
" If the option is not found or recognized (i.e. does not exist in
"   s:vimwiki_defaults), it is saved in a buffer local dictionary, that acts
"   as a cache.
" If the option is not found in the buffer local dictionary, an error is thrown
function! VimwikiSet(option, value, ...) "{{{
  let idx = a:0 == 0 ? g:vimwiki_current_idx : a:1

  if has_key(s:vimwiki_defaults, a:option) ||
        \ has_key(g:vimwiki_list[idx], a:option)
    let g:vimwiki_list[idx][a:option] = a:value
  elseif exists('b:vimwiki_list')
    let b:vimwiki_list[a:option] = a:value
  else
    let b:vimwiki_list = {}
    let b:vimwiki_list[a:option] = a:value
  endif

endfunction "}}}

" Clear option for current wiki or if third parameter exists for
"   wiki with a given index.
" Currently, only works if option was previously saved in the buffer local
"   dictionary, that acts as a cache.
function! VimwikiClear(option, ...) "{{{
  let idx = a:0 == 0 ? g:vimwiki_current_idx : a:1

  if exists('b:vimwiki_list') && has_key(b:vimwiki_list, a:option)
    call remove(b:vimwiki_list, a:option)
  endif

endfunction "}}}
" }}}

" }}}

" CALLBACK functions "{{{
" User can redefine it.
if !exists("*VimwikiLinkHandler") "{{{
  function VimwikiLinkHandler(url)
    return 0
  endfunction
endif "}}}

if !exists("*VimwikiWikiIncludeHandler") "{{{
  function! VimwikiWikiIncludeHandler(value) "{{{
    " Return the empty string when unable to process link
    return ''
  endfunction "}}}
endif "}}}
" CALLBACK }}}

" DEFAULT wiki {{{
let s:vimwiki_defaults = {}
let s:vimwiki_defaults.path = '~/vimwiki/'
let s:vimwiki_defaults.path_html = ''   " '' is replaced by derived path.'_html/'
let s:vimwiki_defaults.css_name = 'style.css'
let s:vimwiki_defaults.index = 'index'
let s:vimwiki_defaults.ext = '.wiki'
let s:vimwiki_defaults.maxhi = 0
let s:vimwiki_defaults.syntax = 'default'

let s:vimwiki_defaults.template_path = ''
let s:vimwiki_defaults.template_default = ''
let s:vimwiki_defaults.template_ext = ''

let s:vimwiki_defaults.nested_syntaxes = {}
let s:vimwiki_defaults.auto_export = 0
" is wiki temporary -- was added to g:vimwiki_list by opening arbitrary wiki
" file.
let s:vimwiki_defaults.temp = 0

" diary
let s:vimwiki_defaults.diary_rel_path = 'diary/'
let s:vimwiki_defaults.diary_index = 'diary'
let s:vimwiki_defaults.diary_header = 'Diary'
let s:vimwiki_defaults.diary_sort = 'desc'

" Do not change this! Will wait till vim become more datetime awareable.
let s:vimwiki_defaults.diary_link_fmt = '%Y-%m-%d'

" NEW! in v2.0
" custom_wiki2html
let s:vimwiki_defaults.custom_wiki2html = ''
"
let s:vimwiki_defaults.list_margin = -1
"}}}

" DEFAULT options {{{
call s:default('list', [s:vimwiki_defaults])
call s:default('auto_checkbox', 1)
call s:default('use_mouse', 0)
call s:default('folding', '')
call s:default('menu', 'Vimwiki')
call s:default('global_ext', 1)
call s:default('ext2syntax', {}) " syntax map keyed on extension
call s:default('hl_headers', 0)
call s:default('hl_cb_checked', 0)
call s:default('list_ignore_newline', 1)
call s:default('listsyms', ' .oOX')
call s:default('use_calendar', 1)
call s:default('table_mappings', 1)
call s:default('table_auto_fmt', 1)
call s:default('w32_dir_enc', '')
call s:default('CJK_length', 0)
call s:default('dir_link', '')
call s:default('valid_html_tags', 'b,i,s,u,sub,sup,kbd,br,hr,div,center,strong,em')
call s:default('user_htmls', '')
call s:default('autowriteall', 1)

call s:default('html_header_numbering', 0)
call s:default('html_header_numbering_sym', '')
call s:default('conceallevel', 2)
call s:default('url_maxsave', 15)
call s:default('debug', 0)

call s:default('diary_months',
      \ {
      \ 1: 'January', 2: 'February', 3: 'March',
      \ 4: 'April', 5: 'May', 6: 'June',
      \ 7: 'July', 8: 'August', 9: 'September',
      \ 10: 'October', 11: 'November', 12: 'December'
      \ })


call s:default('current_idx', 0)

" Scheme regexes should be defined even if syntax file is not loaded yet
" cause users should be able to <leader>w<leader>w without opening any
" vimwiki file first
" Scheme regexes {{{
call s:default('schemes', 'wiki\d\+,diary,local')
call s:default('web_schemes1', 'http,https,file,ftp,gopher,telnet,nntp,ldap,'.
        \ 'rsync,imap,pop,irc,ircs,cvs,svn,svn+ssh,git,ssh,fish,sftp')
call s:default('web_schemes2', 'mailto,news,xmpp,sip,sips,doi,urn,tel')

let rxSchemes = '\%('.
      \ join(split(g:vimwiki_schemes, '\s*,\s*'), '\|').'\|'.
      \ join(split(g:vimwiki_web_schemes1, '\s*,\s*'), '\|').'\|'.
      \ join(split(g:vimwiki_web_schemes2, '\s*,\s*'), '\|').
      \ '\)'

call s:default('rxSchemeUrl', rxSchemes.':.*')
call s:default('rxSchemeUrlMatchScheme', '\zs'.rxSchemes.'\ze:.*')
call s:default('rxSchemeUrlMatchUrl', rxSchemes.':\zs.*\ze')
" scheme regexes }}}
"}}}

" AUTOCOMMANDS for all known wiki extensions {{{
let extensions = vimwiki#base#get_known_extensions()

augroup filetypedetect
  " clear FlexWiki's stuff
  au! * *.wiki
augroup end

augroup vimwiki
  autocmd!
  for ext in extensions
    exe 'autocmd BufEnter *'.ext.' call s:setup_buffer_reenter()'
    exe 'autocmd BufWinEnter *'.ext.' call s:setup_buffer_enter()'
    exe 'autocmd BufLeave,BufHidden *'.ext.' call s:setup_buffer_leave()'
    exe 'autocmd BufNewFile,BufRead, *'.ext.' call s:setup_filetype()'
    exe 'autocmd ColorScheme *'.ext.' call s:setup_cleared_syntax()'
    " Format tables when exit from insert mode. Do not use textwidth to
    " autowrap tables.
    if g:vimwiki_table_auto_fmt
      exe 'autocmd InsertLeave *'.ext.' call vimwiki#tbl#format(line("."))'
      exe 'autocmd InsertEnter *'.ext.' call vimwiki#tbl#reset_tw(line("."))'
    endif
  endfor
augroup END
"}}}

" COMMANDS {{{
command! VimwikiUISelect call vimwiki#base#ui_select()
" XXX: why not using <count> instead of v:count1?
" See Issue 324.
command! -count=1 VimwikiIndex
      \ call vimwiki#base#goto_index(v:count1)
command! -count=1 VimwikiTabIndex
      \ call vimwiki#base#goto_index(v:count1, 1)

command! -count=1 VimwikiDiaryIndex
      \ call vimwiki#diary#goto_diary_index(v:count1)
command! -count=1 VimwikiMakeDiaryNote
      \ call vimwiki#diary#make_note(v:count1)
command! -count=1 VimwikiTabMakeDiaryNote
      \ call vimwiki#diary#make_note(v:count1, 1)

command! VimwikiDiaryGenerateLinks
      \ call vimwiki#diary#generate_diary_section()
"}}}

" MAPPINGS {{{
if !hasmapto('<Plug>VimwikiIndex')
  nmap <silent><unique> <Leader>ww <Plug>VimwikiIndex
endif
nnoremap <unique><script> <Plug>VimwikiIndex :VimwikiIndex<CR>

if !hasmapto('<Plug>VimwikiTabIndex')
  nmap <silent><unique> <Leader>wt <Plug>VimwikiTabIndex
endif
nnoremap <unique><script> <Plug>VimwikiTabIndex :VimwikiTabIndex<CR>

if !hasmapto('<Plug>VimwikiUISelect')
  nmap <silent><unique> <Leader>ws <Plug>VimwikiUISelect
endif
nnoremap <unique><script> <Plug>VimwikiUISelect :VimwikiUISelect<CR>

if !hasmapto('<Plug>VimwikiDiaryIndex')
  nmap <silent><unique> <Leader>wi <Plug>VimwikiDiaryIndex
endif
nnoremap <unique><script> <Plug>VimwikiDiaryIndex :VimwikiDiaryIndex<CR>

if !hasmapto('<Plug>VimwikiDiaryGenerateLinks')
  nmap <silent><unique> <Leader>w<Leader>i <Plug>VimwikiDiaryGenerateLinks
endif
nnoremap <unique><script> <Plug>VimwikiDiaryGenerateLinks :VimwikiDiaryGenerateLinks<CR>

if !hasmapto('<Plug>VimwikiMakeDiaryNote')
  nmap <silent><unique> <Leader>w<Leader>w <Plug>VimwikiMakeDiaryNote
endif
nnoremap <unique><script> <Plug>VimwikiMakeDiaryNote :VimwikiMakeDiaryNote<CR>

if !hasmapto('<Plug>VimwikiTabMakeDiaryNote')
  nmap <silent><unique> <Leader>w<Leader>t <Plug>VimwikiTabMakeDiaryNote
endif
nnoremap <unique><script> <Plug>VimwikiTabMakeDiaryNote
      \ :VimwikiTabMakeDiaryNote<CR>

"}}}

" MENU {{{
function! s:build_menu(topmenu)
  let idx = 0
  while idx < len(g:vimwiki_list)
    let norm_path = fnamemodify(VimwikiGet('path', idx), ':h:t')
    let norm_path = escape(norm_path, '\ \.')
    execute 'menu '.a:topmenu.'.Open\ index.'.norm_path.
          \ ' :call vimwiki#base#goto_index('.(idx + 1).')<CR>'
    execute 'menu '.a:topmenu.'.Open/Create\ diary\ note.'.norm_path.
          \ ' :call vimwiki#diary#make_note('.(idx + 1).')<CR>'
    let idx += 1
  endwhile
endfunction

function! s:build_table_menu(topmenu)
  exe 'menu '.a:topmenu.'.-Sep- :'
  exe 'menu '.a:topmenu.'.Table.Create\ (enter\ cols\ rows) :VimwikiTable '
  exe 'nmenu '.a:topmenu.'.Table.Format<tab>gqq gqq'
  exe 'nmenu '.a:topmenu.'.Table.Move\ column\ left<tab><A-Left> :VimwikiTableMoveColumnLeft<CR>'
  exe 'nmenu '.a:topmenu.'.Table.Move\ column\ right<tab><A-Right> :VimwikiTableMoveColumnRight<CR>'
  exe 'nmenu disable '.a:topmenu.'.Table'
endfunction

"XXX make sure anything below does not cause autoload/base to be loaded
if !empty(g:vimwiki_menu)
  call s:build_menu(g:vimwiki_menu)
  call s:build_table_menu(g:vimwiki_menu)
endif
" }}}

" CALENDAR Hook "{{{
if g:vimwiki_use_calendar
  let g:calendar_action = 'vimwiki#diary#calendar_action'
  let g:calendar_sign = 'vimwiki#diary#calendar_sign'
endif
"}}}


let &cpo = s:old_cpo
doc/vimwiki.txt	[[[1
2372
*vimwiki.txt*   A Personal Wiki for Vim

             __   __  ___   __   __  _     _  ___   ___   _  ___             ~
            |  | |  ||   | |  |_|  || | _ | ||   | |   | | ||   |            ~
            |  |_|  ||   | |       || || || ||   | |   |_| ||   |            ~
            |       ||   | |       ||       ||   | |      _||   |            ~
            |       ||   | |       ||       ||   | |     |_ |   |            ~
             |     | |   | | ||_|| ||   _   ||   | |    _  ||   |            ~
              |___|  |___| |_|   |_||__| |__||___| |___| |_||___|            ~


                               Version: 2.1

==============================================================================
CONTENTS                                                    *vimwiki-contents*

    1. Intro                         |vimwiki|
    2. Prerequisites                 |vimwiki-prerequisites|
    3. Mappings                      |vimwiki-mappings|
        3.1. Global mappings         |vimwiki-global-mappings|
        3.2. Local mappings          |vimwiki-local-mappings|
        3.3. Text objects            |vimwiki-text-objects|
    4. Commands                      |vimwiki-commands|
        4.1. Global commands         |vimwiki-global-commands|
        4.2. Local commands          |vimwiki-local-commands|
    5. Wiki syntax                   |vimwiki-syntax|
        5.1. Typefaces               |vimwiki-syntax-typefaces|
        5.2. Links                   |vimwiki-syntax-links|
        5.3. Headers                 |vimwiki-syntax-headers|
        5.4. Paragraphs              |vimwiki-syntax-paragraphs|
        5.5. Lists                   |vimwiki-syntax-lists|
        5.6. Tables                  |vimwiki-syntax-tables|
        5.7. Preformatted text       |vimwiki-syntax-preformatted|
        5.8. Mathematical formulae   |vimwiki-syntax-math|
        5.9. Blockquotes             |vimwiki-syntax-blockquotes|
        5.10. Comments               |vimwiki-syntax-comments|
        5.11. Horizontal line        |vimwiki-syntax-hr|
        5.12. Schemes                |vimwiki-syntax-schemes|
        5.13. Transclusions          |vimwiki-syntax-transclude|
        5.14. Thumbnails             |vimwiki-syntax-thumbnails|
    6. Folding/Outline               |vimwiki-folding|
    7. Placeholders                  |vimwiki-placeholders|
    8. Todo lists                    |vimwiki-todo-lists|
    9. Tables                        |vimwiki-tables|
    10. Diary                        |vimwiki-diary|
    11. Options                      |vimwiki-options|
        11.1. Registered Wiki        |vimwiki-register-wiki|
        11.2. Temporary Wiki         |vimwiki-temporary-wiki|
        11.3. Per-Wiki Options       |vimwiki-local-options|
        11.4. Global Options         |viwmiki-global-options|
    12. Help                         |vimwiki-help|
    13. Developers                   |vimwiki-developers|
    14. Changelog                    |vimwiki-changelog|
    15. License                      |vimwiki-license|


==============================================================================
1. Intro                                                             *vimwiki*

Vimwiki is a personal wiki for Vim -- a number of linked text files that have
their own syntax highlighting.

With vimwiki you can:
    - organize notes and ideas;
    - manage todo-lists;
    - write documentation.

To do a quick start press <Leader>ww (this is usually \ww) to go to your index
wiki file.  By default it is located in: >
    ~/vimwiki/index.wiki

Feed it with the following example:

= My knowledge base =
    * Tasks -- things to be done _yesterday_!!!
    * Project Gutenberg -- good books are power.
    * Scratchpad -- various temporary stuff.

Place your cursor on 'Tasks' and press Enter to create a link.  Once pressed,
'Tasks' will become '[[Tasks]]' -- a vimwiki link.  Press Enter again to
open it.  Edit the file, save it, and then press Backspace to jump back to your
index.

A vimwiki link can be constructed from more than one word.  Just visually
select the words to be linked and press Enter.  Try it with 'Project
Gutenberg'.  The result should look something like:

= My knowledge base =
    * [[Tasks]] -- things to be done _yesterday_!!!
    * [[Project Gutenberg]] -- good books are power.
    * Scratchpad -- various temporary stuff.

==============================================================================
2. Prerequisites                                       *vimwiki-prerequisites*

Make sure you have these settings in your vimrc file: >
    set nocompatible
    filetype plugin on
    syntax on

Without them Vimwiki will not work properly.


==============================================================================
3. Mappings                                                 *vimwiki-mappings*

There are global and local mappings in vimwiki.

------------------------------------------------------------------------------
3.1. Global mappings                                 *vimwiki-global-mappings*

[count]<Leader>ww or <Plug>VimwikiIndex
        Open index file of the [count]'s wiki.

        <Leader>ww opens the first wiki from |g:vimwiki_list|.
        1<Leader>ww as above, opens the first wiki from |g:vimwiki_list|.
        2<Leader>ww opens the second wiki from |g:vimwiki_list|.
        3<Leader>ww opens the third wiki from |g:vimwiki_list|.
        etc.
        To remap: >
        :nmap <Leader>w <Plug>VimwikiIndex
<
See also |:VimwikiIndex|


[count]<Leader>wt or <Plug>VimwikiTabIndex
        Open index file of the [count]'s wiki in a new tab.

        <Leader>wt tabopens the first wiki from |g:vimwiki_list|.
        1<Leader>wt as above tabopens the first wiki from |g:vimwiki_list|.
        2<Leader>wt tabopens the second wiki from |g:vimwiki_list|.
        3<Leader>wt tabopens the third wiki from |g:vimwiki_list|.
        etc.
        To remap: >
        :nmap <Leader>t <Plug>VimwikiTabIndex
<
See also |:VimwikiTabIndex|


<Leader>ws or <Plug>VimwikiUISelect
        List and select available wikies.
        To remap: >
        :nmap <Leader>wq <Plug>VimwikiUISelect
<
See also |:VimwikiUISelect|


[count]<Leader>wi or <Plug>VimwikiDiaryIndex
        Open diary index file of the [count]'s wiki.

        <Leader>wi opens diary index file of the first wiki from
        |g:vimwiki_list|.
        1<Leader>wi the same as above.
        2<Leader>wi opens diary index file of the second wiki from
        |g:vimwiki_list|.
        etc.
        To remap: >
        :nmap <Leader>i <Plug>VimwikiDiaryIndex

See also |:VimwikiDiaryIndex|


[count]<Leader>w<Leader>w or <Plug>VimwikiMakeDiaryNote
        Open diary wiki-file for today of the [count]'s wiki.

        <Leader>w<Leader>w opens diary wiki-file for today in the first wiki
        from |g:vimwiki_list|.
        1<Leader>w<Leader>w as above opens diary wiki-file for today in the
        first wiki from |g:vimwiki_list|.
        2<Leader>w<Leader>w opens diary wiki-file for today in the second wiki
        from |g:vimwiki_list|.
        3<Leader>w<Leader>w opens diary wiki-file for today in the third wiki
        from |g:vimwiki_list|.
        etc.
        To remap: >
        :nmap <Leader>d <Plug>VimwikiMakeDiaryNote
<
See also |:VimwikiMakeDiaryNote|


[count]<Leader>w<Leader>t or <Plug>VimwikiTabMakeDiaryNote
        Open diary wiki-file for today of the [count]'s wiki in a new tab.

        <Leader>w<Leader>t tabopens diary wiki-file for today in the first
        wiki from |g:vimwiki_list|.
        1<Leader>w<Leader>t as above tabopens diary wiki-file for today in the
        first wiki from |g:vimwiki_list|.
        2<Leader>w<Leader>t tabopens diary wiki-file for today in the second
        wiki from |g:vimwiki_list|.
        3<Leader>w<Leader>t tabopens diary wiki-file for today in the third
        wiki from |g:vimwiki_list|.
        etc.
        To remap: >
        :nmap <Leader>dt <Plug>VimwikiTabMakeDiaryNote
<
See also |:VimwikiTabMakeDiaryNote|


------------------------------------------------------------------------------
3.2. Local mappings

NORMAL MODE                                           *vimwiki-local-mappings*
                        *vimwiki_<Leader>wh*
<Leader>wh              Convert current wiki page to HTML.
                        Maps to |:Vimwiki2HTML|
                        To remap: >
                        :nmap <Leader>wc <Plug>Vimwiki2HTML
<
                        *vimwiki_<Leader>whh*
<Leader>whh             Convert current wiki page to HTML and open it in
                        webbrowser.
                        Maps to |:Vimwiki2HTML|
                        To remap: >
                        :nmap <Leader>wcc <Plug>Vimwiki2HTMLBrowse
<
                        *vimwiki_<Leader>w<Leader>i*
<Leader>w<Leader>i      Update diary section (delete old, insert new)
                        Only works from the diary index.
                        Maps to |:VimwikiDiaryGenerateLinks|
                        To remap: >
                        :nmap <Leader>wcr <Plug>VimwikiDiaryGenerateLinks
<
                        *vimwiki_<CR>*
<CR>                    Follow/create wiki link (create target wiki page if
                        needed).
                        Maps to |:VimwikiFollowLink|.
                        To remap: >
                        :nmap <Leader>wf <Plug>VimwikiFollowLink
<
                        *vimwiki_<S-CR>*
<S-CR>                  Split and follow (create target wiki page if needed).
                        May not work in some terminals. Remapping could help.
                        Maps to |:VimwikiSplitLink|.
                        To remap: >
                        :nmap <Leader>we <Plug>VimwikiSplitLink
<
                        *vimwiki_<C-CR>*
<C-CR>                  Vertical split and follow (create target wiki page if
                        needed).
                        May not work in some terminals. Remapping could help.
                        Maps to |:VimwikiVSplitLink|.
                        To remap: >
                        :nmap <Leader>wq <Plug>VimwikiVSplitLink
<
                        *vimwiki_<C-S-CR>*    *vimwiki_<D-CR>*
<C-S-CR>, <D-CR>        Follow wiki link (create target wiki page if needed),
                        opening in a new tab.
                        May not work in some terminals. Remapping could help.
                        Maps to |:VimwikiTabnewLink|.
                        To remap: >
                        :nmap <Leader>wt <Plug>VimwikiTabnewLink
<
                        *vimwiki_<Backspace>*
<Backspace>             Go back to previous wiki page.
                        Maps to |:VimwikiGoBackLink|.
                        To remap: >
                        :nmap <Leader>wb <Plug>VimwikiGoBackLink
<
                        *vimwiki_<Tab>*
<Tab>                   Find next link on the current page.
                        Maps to |:VimwikiNextLink|.
                        To remap: >
                        :nmap <Leader>wn <Plug>VimwikiNextLink
<
                        *vimwiki_<S-Tab>*
<S-Tab>                 Find previous link on the current page.
                        Maps to |:VimwikiPrevLink|.
                        To remap: >
                        :nmap <Leader>wp <Plug>VimwikiPrevLink
<
                        *vimwiki_<Leader>wd*
<Leader>wd              Delete wiki page you are in.
                        Maps to |:VimwikiDeleteLink|.
                        To remap: >
                        :nmap <Leader>dd <Plug>VimwikiDeleteLink
<
                        *vimwiki_<Leader>wr*
<Leader>wr              Rename wiki page you are in.
                        Maps to |:VimwikiRenameLink|.
                        To remap: >
                        :nmap <Leader>rr <Plug>VimwikiRenameLink
<
                        *vimwiki_<C-Space>*
<C-Space>               Toggle list item on/off (checked/unchecked)
                        Maps to |:VimwikiToggleListItem|.
                        To remap: >
                        :nmap <leader>tt <Plug>VimwikiToggleListItem
<                       See |vimwiki-todo-lists|.

                        *vimwiki_=*
=                       Add header level. Create if needed.
                        There is nothing to indent with '==' command in
                        vimwiki, so it should be ok to use '=' here.
                        To remap: >
                        :nmap == <Plug>VimwikiAddHeaderLevel
<
                        *vimwiki_-*
-                       Remove header level.
                        To remap: >
                        :nmap -- <Plug>VimwikiRemoveHeaderLevel
<
                        *vimwiki_+*
+                       Create and/or decorate links.  Depending on the
                        context, this command will: convert words into
                        Wikilinks; convert raw URLs into Wikilinks; and add
                        placeholder text to Wiki- or Weblinks that are missing
                        descriptions.  Can be activated in normal mode with
                        the cursor over a word or link, or in visual mode with
                        the selected text .

                        *vimwiki_glm*
glm                     Increase the indent of a single-line list item.

                        *vimwiki_gll*
gll                     Decrease the indent of a single-line list item.

                        *vimwiki_glstar* *vimwiki_gl8*
gl* or gl8              Switch or insert a "*" symbol.  Only available in
                        supported syntaxes.

                        *vimwiki_gl#* *vimwiki_gl3*
gl# or gl3              Switch or insert a "#" symbol.  Only available in
                        supported syntaxes.

                        *vimwiki_gl-*
gl-                     Switch or insert a "-" symbol.  Only available in
                        supported syntaxes.

                        *vimwiki_gl1*
gl1                     Switch or insert a "1." symbol.  Only available in
                        supported syntaxes.

                        *vimwiki_gqq*  *vimwiki_gww*
gqq                     Format table. If you made some changes to a table
 or                     without swapping insert/normal modes this command
gww                     will reformat it.

                        *vimwiki_<A-Left>*
<A-Left>                Move current table column to the left.
                        See |:VimwikiTableMoveColumnLeft|
                        To remap: >
                        :nmap <Leader>wtl <Plug>VimwikiTableMoveColumnLeft
<
                        *vimwiki_<A-Right>*
<A-Right>               Move current table column to the right.
                        See |:VimwikiTableMoveColumnRight|
                        To remap: >
                        :nmap <Leader>wtr <Plug>VimwikiTableMoveColumnRight
<
                        *vimwiki_<C-Up>*
<C-Up>                  Open the previous day's diary link if available.
                        See |:VimwikiDiaryPrevDay|

                        *vimwiki_<C-Down>*
<C-Down>                Open the next day's diary link if available.
                        See |:VimwikiDiaryNextDay|


Works only if |g:vimwiki_use_mouse| is set to 1.
<2-LeftMouse>           Follow wiki link (create target wiki page if needed).

<S-2-LeftMouse>         Split and follow wiki link (create target wiki page if
                        needed).

<C-2-LeftMouse>         Vertical split and follow wiki link (create target
                        wiki page if needed).

<RightMouse><LeftMouse> Go back to previous wiki page.

Note: <2-LeftMouse> is just left double click.



INSERT MODE                                           *vimwiki-table-mappings*
                        *vimwiki_i_<CR>*
<CR>                    Go to the table cell beneath the current one, create
                        a new row if on the last one.

                        *vimwiki_i_<Tab>*
<Tab>                   Go to the next table cell, create a new row if on the
                        last cell.
See |g:vimwiki_table_mappings| to turn them off.


------------------------------------------------------------------------------
3.3. Text objects                                       *vimwiki-text-objects*

ah                      A section segment (the area between two consecutive
                        headings) including trailing empty lines.
ih                      A section segment without trailing empty lines.

You can 'vah' to select a section segment with its contents or 'dah' to delete
it or 'yah' to yank it or 'cah' to change it.

a\                      A cell in a table.
i\                      An inner cell in a table.
ac                      A column in a table.
ic                      An inner column in a table.


==============================================================================
4. Commands                                                 *vimwiki-commands*

------------------------------------------------------------------------------
4.1. Global Commands                                 *vimwiki-global-commands*

*:VimwikiIndex*
    Open index file of the current wiki.

*:VimwikiTabIndex*
    Open index file of the current wiki in a new tab.

*:VimwikiUISelect*
    Open index file of the selected wiki.

*:VimwikiDiaryIndex*
    Open diary index file of the current wiki.

*:VimwikiMakeDiaryNote*
    Open diary wiki-file for today of the current wiki.

*:VimwikiTabMakeDiaryNote*
    Open diary wiki-file for today of the current wiki in a new tab.


------------------------------------------------------------------------------
4.2. Local commands                                   *vimwiki-local-commands*

*:VimwikiFollowLink*
    Follow wiki link (create target wiki page if needed).

*:VimwikiGoBackLink*
    Go back to the wiki page you came from.

*:VimwikiSplitLink*
    Split and follow wiki link (create target wiki page if needed).

*:VimwikiVSplitLink*
    Vertical split and follow wiki link (create target wiki page if needed).

*:VimwikiTabnewLink*
    Follow wiki link in a new tab (create target wiki page if needed).

*:VimwikiNextLink*
    Find next link on the current page.

*:VimwikiPrevLink*
    Find previous link on the current page.

*:VimwikiGoto*
    Goto link provided by an argument. For example: >
        :VimwikiGoto HelloWorld
<   opens opens/creates HelloWorld wiki page.

*:VimwikiDeleteLink*
    Delete the wiki page that you are in.

*:VimwikiRenameLink*
    Rename the wiki page that you are in.

*:Vimwiki2HTML*
    Convert current wiki page to HTML using vimwiki's own converter or a
    user-supplied script (see |vimwiki-option-custom_wiki2html|).

*:Vimwiki2HTMLBrowse*
    Convert current wiki page to HTML and open it in webbrowser.

*:VimwikiAll2HTML*
    Convert all wiki pages to HTML.
    Default css file (style.css) is created if there is no one.

*:VimwikiToggleListItem*
    Toggle list item on/off (checked/unchecked)
    See |vimwiki-todo-lists|.

*:VimwikiListChangeLevel* CMD
    Change the nesting level, or symbol, for a single-line list item.
    CMD may be ">>" or "<<" to change the indentation of the item, or
    one of the syntax-specific bullets: "*", "#", "1.", "-".
    See |vimwiki-todo-lists|.

*:VimwikiSearch* /pattern/
*:VWS* /pattern/
    Search for /pattern/ in all files of current wiki.
    To display all matches use |:lopen| command.
    To display next match use |:lnext| command.
    To display previous match use |:lprevious| command.

*:VimwikiBacklinks*
*:VWB*
    Search for wikilinks to the [[current wiki page]]
    in all files of current wiki.
    To display all matches use |:lopen| command.
    To display next match use |:lnext| command.
    To display previous match use |:lprevious| command.


*:VimwikiTable*
    Create a table with 5 cols and 2 rows.

    :VimwikiTable cols rows
    Create a table with the given cols and rows

    :VimwikiTable cols
    Create a table with the given cols and 2 rows


*:VimwikiTableMoveColumnLeft* , *:VimwikiTableMoveColumnRight*
    Move current column to the left or to the right:
    Example: >

    | head1  | head2  | head3  | head4  | head5  |
    |--------|--------|--------|--------|--------|
    | value1 | value2 | value3 | value4 | value5 |


    Cursor is on 'head1'.
    :VimwikiTableMoveColumnRight

    | head2  | head1  | head3  | head4  | head5  |
    |--------|--------|--------|--------|--------|
    | value2 | value1 | value3 | value4 | value5 |

    Cursor is on 'head3'.
    :VimwikiTableMoveColumnLeft

    | head2  | head3  | head1  | head4  | head5  |
    |--------|--------|--------|--------|--------|
    | value2 | value3 | value1 | value4 | value5 |
<

    Commands are mapped to <A-Left> and <A-Right> respectively.


*:VimwikiGenerateLinks*
    Insert all available links into current buffer.

*:VimwikiDiaryGenerateLinks*
    Delete old, insert new diary section into diary index file.

*:VimwikiDiaryNextDay*
    Open next day diary link if available.
    Mapped to <C-Down>.

*:VimwikiDiaryPrevDay*
    Open previous day diary link if available.
    Mapped to <C-Up>.


==============================================================================
5. Wiki syntax                                                *vimwiki-syntax*


There are a lot of different wikies out there. Most of them have their own
syntax and vimwiki's default syntax is not an exception here.

Vimwiki has evolved its own syntax that closely resembles google's wiki
markup.  This syntax is described in detail below.

Vimwiki also supports alternative syntaxes, like Markdown and MediaWiki, to
varying degrees; see |vimwiki-option-syntax|.  Static elements like headers,
quotations, and lists are customized in syntax/vimwiki_xxx.vim, where xxx
stands for the chosen syntax.

Interactive elements such as links and vimwiki commands are supported by
definitions and routines in syntax/vimwiki_xxx_custom.vim and
autoload/vimwiki/xxx_base.vim.  Currently, only Markdown includes this level
of support.

Vimwiki2HTML is currently functional only for the default syntax.

------------------------------------------------------------------------------
5.1. Typefaces                                      *vimwiki-syntax-typefaces*

There are a few typefaces that gives you a bit of control over how your
text should be decorated: >
  *bold text*
  _italic text_
  ~~strikeout text~~
  `code (no syntax) text`
  super^script^
  sub,,script,,


------------------------------------------------------------------------------
5.2. Links                                              *vimwiki-syntax-links*

Wikilinks~

Link with spaces in it: >
  [[This is a link]]
or: >
  [[This is a link source|Description of the link]]

Links to directories (ending with a "/") are also supported: >
  [[/home/somebody/|Home Directory]]

Use |g:vimwiki_dir_link| to control the behaviour when opening directories.

Raw URLs~

Raw URLs are also supported: >
  http://code.google.com/p/vimwiki
  mailto:habamax@gmail.com
  ftp://vim.org


Markdown Links~

These links are only available for Markdown syntax.  See
http://daringfireball.net/projects/markdown/syntax#link.

Inline link: >
  [Looks like this](URL)

Image link: >
  ![Looks like this](URL)

The URL can be anything recognized by vimwiki as a raw URL.


Reference-style links: >
  a) [Link Name][Id]
  b) [Id][], using the "implicit link name" shortcut

Reference style links must always include *two* consecutive pairs of
[-brackets, and field entries can not use "[" or "]".


NOTE: (in Vimwiki's current implementation) Reference-style links are a hybrid
of Vimwiki's default "Wikilink" and the tradition reference-style link.

If the Id is defined elsewhere in the source, as per the Markdown standard: >
  [Id]: URL

then the URL is opened with the system default handler.  Otherwise, Vimwiki
treats the reference-style link as a Wikilink, interpreting the Id field as a
wiki page name.

Highlighting of existing links when |vimwiki-option-maxhi| is activated
identifies links whose Id field is not defined, either as a reference-link or
as a wiki page.

To scan the page for new or changed definitions for reference-links, simply
re-open the page ":e<CR>".


------------------------------------------------------------------------------
5.3. Headers                                          *vimwiki-syntax-headers*

= Header level 1 =~
By default all headers are highlighted using |hl-Title| highlight group.

== Header level 2 ==~
You can set up different colors for each header level: >
  :hi VimwikiHeader1 guifg=#FF0000
  :hi VimwikiHeader2 guifg=#00FF00
  :hi VimwikiHeader3 guifg=#0000FF
  :hi VimwikiHeader4 guifg=#FF00FF
  :hi VimwikiHeader5 guifg=#00FFFF
  :hi VimwikiHeader6 guifg=#FFFF00
Set up colors for all 6 header levels or none at all.

=== Header level 3 ===~
==== Header level 4 ====~
===== Header level 5 =====~
====== Header level 6 ======~


You can center your headers in HTML by placing spaces before the first '=':
                     = Centered Header L1 =~


------------------------------------------------------------------------------
5.4. Paragraphs                                    *vimwiki-syntax-paragraphs*

A paragraph is a group of lines starting in column 1 (no indentation).
Paragraphs are separated by a blank line:

This is first paragraph
with two lines.

This is a second paragraph with
two lines.


------------------------------------------------------------------------------
5.5. Lists                                              *vimwiki-syntax-lists*

Unordered lists: >
  * Bulleted list item 1
  * Bulleted list item 2
    * Bulleted list sub item 1
    * Bulleted list sub item 2
    * more ...
      * and more ...
      * ...
    * Bulleted list sub item 3
    * etc.
or: >
  - Bulleted list item 1
  - Bulleted list item 2
    - Bulleted list sub item 1
    - Bulleted list sub item 2
    - more ...
      - and more ...
      - ...
    - Bulleted list sub item 3
    - etc.

or mix: >
  - Bulleted list item 1
  - Bulleted list item 2
    * Bulleted list sub item 1
    * Bulleted list sub item 2
    * more ...
      - and more ...
      - ...
    * Bulleted list sub item 3
    * etc.

Ordered lists: >
  # Numbered list item 1
  # Numbered list item 2
    # Numbered list sub item 1
    # Numbered list sub item 2
    # more ...
      # and more ...
      # ...
    # Numbered list sub item 3
    # etc.

It is possible to mix bulleted and numbered lists: >
  * Bulleted list item 1
  * Bulleted list item 2
    # Numbered list sub item 1
    # Numbered list sub item 2

Note that a space after *, - or # is essential.

Multiline list items: >
  * Bulleted list item 1
    List item 1 continued line.
    List item 1 next continued line.
  * Bulleted list item 2
    * Bulleted list sub item 1
      List sub item 1 continued line.
      List sub item 1 next continued line.
    * Bulleted list sub item 2
    * etc.

Definition lists: >
Term 1:: Definition 1
Term 2::
:: Definition 2
:: Definition 3


------------------------------------------------------------------------------
5.6. Tables                                            *vimwiki-syntax-tables*

Tables are created by entering the content of each cell separated by |
delimiters. You can insert other inline wiki syntax in table cells, including
typeface formatting and links.
For example: >

 | Year | Temperature (low) | Temperature (high) |
 |------|-------------------|--------------------|
 | 1900 | -10               | 25                 |
 | 1910 | -15               | 30                 |
 | 1920 | -10               | 32                 |
 | 1930 | _N/A_             | _N/A_              |
 | 1940 | -2                | 40                 |
>

In HTML the following part >
 | Year | Temperature (low) | Temperature (high) |
 |------|-------------------|--------------------|
>
is higlighted as a table header.

If you indent a table then it will be centered in HTML.

If you set > in a cell, the cell spans the left column.
If you set \/ in a cell, the cell spans the above row.
For example: >

 | a  | b  | c | d |
 | \/ | e  | > | f |
 | \/ | \/ | > | g |
 | h  | >  | > | > |
>

See |vimwiki-tables| for more details on how to manage tables.


------------------------------------------------------------------------------
5.7. Preformatted text                           *vimwiki-syntax-preformatted*

Use {{{ and }}} to define a block of preformatted text:
{{{ >
  Tyger! Tyger! burning bright
   In the forests of the night,
    What immortal hand or eye
     Could frame thy fearful symmetry?
  In what distant deeps or skies
   Burnt the fire of thine eyes?
    On what wings dare he aspire?
     What the hand dare sieze the fire?
}}}


You can add optional information to {{{ tag: >
{{{class="brush: python" >
 def hello(world):
     for x in range(10):
         print("Hello {0} number {1}".format(world, x))
}}}

Result of HTML export: >
 <pre class="brush: python">
 def hello(world):
     for x in range(10):
         print("Hello {0} number {1}".format(world, x))
 </pre>

This might be useful for coloring program code with external js tools
such as google's syntax highlighter.

You can setup vimwiki to highlight code snippets in preformatted text.
See |vimwiki-option-nested_syntaxes|


------------------------------------------------------------------------------
5.8. Mathematical formulae                              *vimwiki-syntax-math*

Mathematical formulae are highlighted, and can be rendered in HTML using the
powerful open source display engine MathJax (http://www.mathjax.org/).

There are three supported syntaxes, which are inline, block display and
block environment.

Inline math is for short formulae within text. It is enclosed by single
dollar signs, e.g.:
 $ \sum_i a_i^2 = 1 $

Block display creates a centered formula with some spacing before and after
it. It must start with a line including only {{$, then an arbitrary number
of mathematical text are allowed, and it must end with a line including only
}}$.
E.g.:
 {{$
 \sum_i a_i^2
 =
 1
 }}$

Note: no matter how many lines are used in the text file, the HTML will
compress it to *one* line only.

Block environment is similar to block display, but is able to use specific
LaTeX environments, such as 'align'. The syntax is the same as for block
display, except for the first line which is {{$%environment%.
E.g.:
 {{$%align%
 \sum_i a_i^2 &= 1 + 1 \\
 &= 2.
 }}$

Similar compression rules for the HTML page hold (as MathJax interprets the
LaTeX code).

Note: the highlighting in VIM is automatic. For the rendering in HTML, you
have two *alternative* options:

1. using the MathJax server for rendering (needs an internet connection).
Add to your HTML template the following line:

<script type="text/javascript" src="http://cdn.mathjax.org/mathjax/latest/MathJax.js?config=TeX-AMS-MML_HTMLorMML"></script>

2. installing MathJax locally (faster, no internet required). Choose a
folder on your hard drive and save MathJax in it. Then add to your HTML
template the following line:

<script type="text/javascript" src="<mathjax_folder>/MathJax.js?config=TeX-AMS-MML_HTMLorMML"></script>

where <mathjax_folder> is the folder on your HD, as a relative path to the
template folder. For instance, a sensible folder structure could be:

- wiki
  - text
  - html
  - templates
  - mathjax

In this case, <mathjax_folder> would be "../mathjax" (without quotes).


------------------------------------------------------------------------------
5.9. Blockquotes                                  *vimwiki-syntax-blockquotes*

Text started with 4 or more spaces is a blockquote.

    This would be a blockquote in vimwiki. It is not highlighted in vim but
    could be styled by CSS in HTML. Blockquotes are usually used to quote a
    long piece of text from another source.


------------------------------------------------------------------------------
5.10. Comments                                        *vimwiki-syntax-comments*

Text line started with %% is a comment.
E.g.: >
 %% this text would not be in HTML
<


------------------------------------------------------------------------------
5.11. Horizontal line                                      *vimwiki-syntax-hr*

4 or more dashes at the start of the line is a 'horizontal line' (<hr />): >
 ----
<

------------------------------------------------------------------------------
5.12. Schemes                                           *vimwiki-syntax-schemes*

In addition to standard web schemes (e.g. `http:`, `https:`, `ftp:`, etc.) a
number of special schemes are supported: "wiki#:", "local:", "diary:",
"file:", and schemeless.

While "wiki:#", "diary" and schemeless links are automatically opened in Vi,
all other links are opened with the system command.  To customize this
behavior, see |VimwikiLinkHandler|.

Interwiki:~

If you maintain more than one wiki, you can create interwiki links between them
by adding a numbered prefix "wiki#:" in front of a link: >
  [[wiki#:This is a link]]
or: >
  [[wiki#:This is a link source|Description of the link]]

The number "#", in the range 0..N-1, identifies the destination wiki in
|g:vimwiki_list|.

Diary:~

The diary scheme is used to concisely link to diary entries: >
  [[diary:2012-03-05]]

This scheme precludes explicit inclusion of |vimwiki-option-diary_rel_path|,
and is most useful on subwiki pages to avoid links such as: >
  [[../../diary/2012-03-05]]

Local:~

A local resource that is not a wiki page may be specified with a path relative
to the current page: >
  [[local:../assets/data.csv|data (CSV)]]

When followed or converted to HTML, extensions of local-scheme links are not
modified.

File:~

The file scheme allows you to directly link to arbitray resources using
absolute paths and extensions: >
  [[file:///home/somebody/a/b/c/music.mp3]]

Schemeless:~

Schemeless URLs, which are the default, are treated internally as "wiki#:"
URLs in all respects except when converted to Html.

Schemeless links convert to plain relative path URLs, nearly verbatim: >
  relpath/wikipage.html

The "wiki#:", "local:", and "diary:" schemes use absolute paths as URLs: >
  file:///abs_path_to_html#/relpath/wikipage.html

When |vimwiki-option-maxhi| equals 1, a distinct highlighting style is used to
identify schemeless links whose targets are not found.  All other links appear
as regular links even if the files to which they refer do not exist.


------------------------------------------------------------------------------
5.13. Transclusions                                *vimwiki-syntax-transclude*

Transclusion (Wiki-Include) Links~

Links that use "{{" and "}}" delimiters signify content that is to be
included into the Html output, rather than referenced via hyperlink.

Wiki-include URLs may use any of the supported schemes, may be absolute or
relative, and need not end with an extension.

The primary purpose for wiki-include links is to include images.

Transclude from a local URL: >
  {{local:../../images/vimwiki_logo.png}}
or from a universal URL: >
  {{http://vimwiki.googlecode.com/hg/images/vimwiki_logo.png}}

Transclude image with alternate text: >
  {{http://vimwiki.googlecode.com/hg/images/vimwiki_logo.png|Vimwiki}}
in HTML: >
  <img src="http://vimwiki.googlecode.com/hg/images/vimwiki_logo.png"
  alt="Vimwiki"/>

Transclude image with alternate text and some style: >
  {{http://.../vimwiki_logo.png|cool stuff|style="width:150px; height: 120px;"}}
in HTML: >
  <img src="http://vimwiki.googlecode.com/hg/images/vimwiki_logo.png"
  alt="cool stuff" style="width:150px; height:120px"/>

Transclude image _without_ alternate text and with css class: >
  {{http://.../vimwiki_logo.png||class="center flow blabla"}}
in HTML: >
  <img src="http://vimwiki.googlecode.com/hg/images/vimwiki_logo.png"
  alt="" class="center flow blabla"/>

A trial feature allows you to supply your own handler for wiki-include links.
See |VimwikiWikiIncludeHandler|.


------------------------------------------------------------------------------
5.14. Thumbnails                                    *vimwiki-syntax-thumbnails*

Thumbnail links~
>
Thumbnail links are constructed like this: >
  [[http://someaddr.com/bigpicture.jpg|{{http://someaddr.com/thumbnail.jpg}}]]

in HTML: >
  <a href="http://someaddr.com/ ... /.jpg">
  <img src="http://../thumbnail.jpg /></a>




==============================================================================
6. Folding/Outline                                           *vimwiki-folding*

Vimwiki can fold or outline sections using headers and preformatted blocks.
Alternatively, one can fold list subitems instead.

Example for list folding:
= My current task =
  * [ ] Do stuff 1
    * [ ] Do substuff 1.1
    * [ ] Do substuff 1.2
      * [ ] Do substuff 1.2.1
      * [ ] Do substuff 1.2.2
    * [ ] Do substuff 1.3
  * [ ] Do stuff 2
  * [ ] Do stuff 3

Hit |zM| :
= My current task = [8] --------------------------------------~

Hit |zr| :
= My current task =~
  * [ ] Do stuff 1 [5] --------------------------------------~
  * [ ] Do stuff 2~
  * [ ] Do stuff 3~

Hit |zr| one more time:
= My current task =~
  * [ ] Do stuff 1~
    * [ ] Do substuff 1.1~
    * [ ] Do substuff 1.2 [2] -------------------------------~
    * [ ] Do substuff 1.3~
  * [ ] Do stuff 2~
  * [ ] Do stuff 3~

NOTE:If you use the default vimwiki syntax, folding on list items will work
properly only if all of them are indented using current |shiftwidth|.
For MediaWiki, * or # should be in the first column.

To turn folding on/off check |g:vimwiki_folding|.


==============================================================================
7. Placeholders                                         *vimwiki-placeholders*

------------------------------------------------------------------------------
%toc Table of Contents               *vimwiki-toc* *vimwiki-table-of-contents*

You can add 'table of contents' to your HTML page generated from wiki one.
Just place >

%toc

into your wiki page.
You can also add a caption to your 'toc': >

%toc Table of Contents

or >

%toc Whatever


------------------------------------------------------------------------------
%title Title of the page                                       *vimwiki-title*

When you htmlize your wiki page, the default title is the filename of the
page. Place >

%title My books

into your wiki page if you want another title.


------------------------------------------------------------------------------
%nohtml                                                       *vimwiki-nohtml*

If you do not want a wiki page to be converted to HTML, place:

%nohtml

into it.


------------------------------------------------------------------------------
%template                                                   *vimwiki-template*

To apply a concrete HTML template to a wiki page, place:

%template name

into it.

See |vimwiki-option-template_path| for details.


==============================================================================
8. Todo lists                                             *vimwiki-todo-lists*

You can have todo lists -- lists of items you can check/uncheck.

Consider the following example:
= Toggleable list of todo items =
  * [X] Toggle list item on/off.
    * [X] Simple toggling between [ ] and [X].
    * [X] All list's subitems should be toggled on/off appropriately.
    * [X] Toggle child subitems only if current line is list item
    * [X] Parent list item should be toggled depending on it's child items.
  * [X] Make numbered list items toggleable too
  * [X] Add highlighting to list item boxes
  * [X] Add [ ] to the next created with o, O and <CR> list item.

Pressing <C-Space> on the first list item will toggle it and all of its child
items:
= Toggleable list of todo items =
  * [ ] Toggle list item on/off.
    * [ ] Simple toggling between [ ] and [X].
    * [ ] All of a list's subitems should be toggled on/off appropriately.
    * [ ] Toggle child subitems only if the current line is a list item.
    * [ ] Parent list item should be toggled depending on their child items.
  * [X] Make numbered list items toggleable too.
  * [X] Add highlighting to list item boxes.
  * [X] Add [ ] to the next list item created using o, O or <CR>.

Pressing <C-Space> on the third list item will toggle it and adjust all of its
parent items:
= Toggleable list of todo items =
  * [.] Toggle list item on/off.
    * [ ] Simple toggling between [ ] and [X].
    * [X] All of a list's subitems should be toggled on/off appropriately.
    * [ ] Toggle child subitems only if current line is list item.
    * [ ] Parent list item should be toggled depending on it's child items.
  * [ ] Make numbered list items toggleable too.
  * [ ] Add highlighting to list item boxes.
  * [ ] Add [ ] to the next list item created using o, O or <CR>.

Parent items could be changed when their child items change. The symbol
between [ ] depends on the percentage of toggled child items (see also
|g:vimwiki_listsyms|): >
    [ ] -- 0%
    [.] -- 1-33%
    [o] -- 34-66%
    [O] -- 67-99%
    [X] -- 100%

It is possible to toggle several list items using visual mode.

                                                   *vimwiki-list-manipulation*
The indentation and bullet symbols for list items can be manipulated using
several mappings.  Examples below demonstrate this behavior for the 'default'
syntax and with |vimwiki-option-list_margin| = 1. >

     Mapping    |      Input       |     Output
   ----------------------------------------------------
       glm      |   ^item          |   ^ - item
       glm      |   ^     item     |   ^     - item
       gll      |   ^ - item       |   ^item
       glm      |   ^   # item     |   ^   item
       gl*      |   ^ item         |   ^ * item
       gl-      |   ^  item        |   ^  - item
       gl3      |   ^   item       |   ^   # item

See |vimwiki_gll|, |vimwiki_glm|, |vimwiki_glstar|, |vimwiki_gl8|
|vimwiki_gl#|, |vimwiki_gl3|, |vimwiki_gl-|, |vimwiki_gl1|
==============================================================================
9. Tables                                                     *vimwiki-tables*

Use the  :VimwikiTable command to create a default table with 5 columns and 2
rows: >

 |   |   |   |   |   |
 |---|---|---|---|---|
 |   |   |   |   |   |
<

Tables are auto-formattable. Let's add some text into first cell: >

 | First Name  |   |   |   |   |
 |---|---|---|---|---|
 |   |   |   |   |   |
<

Whenever you press <TAB>, <CR> or leave Insert mode, the table is formatted: >

 | First Name |   |   |   |   |
 |------------|---|---|---|---|
 |            |   |   |   |   |
<

You can easily create nice-looking text tables, just press <TAB> and enter new
values: >

 | First Name | Last Name  | Age | City     | e-mail               |
 |------------|------------|-----|----------|----------------------|
 | Vladislav  | Pokrishkin | 31  | Moscow   | vlad_pok@smail.com   |
 | James      | Esfandiary | 27  | Istanbul | esfandiary@tmail.com |
<

To indent table indent the first row. Then format it with 'gqq'.


==============================================================================
10. Diary                                                      *vimwiki-diary*

The diary helps you make daily notes. You can easily add information into
vimwiki that should be sorted out later. Just hit <Leader>w<Leader>w to create
new daily note with name based on current date.

To generate diary section with all available links one can use
|:VimwikiDiaryGenerateLinks| or <Leader>w<Leader>i .

Note: it works only for diary index file.

Example of diary section: >
    = Diary =

    == 2011 ==

    === December ===
        * [[2011-12-09]]
        * [[2011-12-08]]


See |g:vimwiki_diary_months| if you would like to rename months.



Calendar integration                                        *vimwiki-calendar*
------------------------------------------------------------------------------
If you have Calendar.vim installed you can use it to create diary notes.
Just open calendar with :Calendar and tap <Enter> on the date. A wiki file
will be created in the default wiki's diary.

Get it from http://www.vim.org/scripts/script.php?script_id=52

See |g:vimwiki_use_calendar| option to turn it off/on.



==============================================================================
11. Options                                                  *vimwiki-options*

There are global options and local (per-wiki) options available to tune
vimwiki.

Global options are configured via global variables.  For a complete list of
them, see |viwmiki-global-options|.

Local options for multiple independent wikis are stored in a single global
variable |g:vimwiki_list|.  The per-wiki options can be registered in advance,
as described in |vimwiki-register-wiki|, or may be registered on the fly as
described in |vimwiki-temporary-wiki|.  For a list of per-wiki options, see
|vimwiki-local-options|.


------------------------------------------------------------------------------
11.1 Registered Wiki                    *g:vimwiki_list* *vimwiki-register-wiki*

One or more wikis can be registered using the |g:vimwiki_list| variable.

Each item in |g:vimwiki_list| is a |Dictionary| that holds all customizations
available for a distinct wiki. The options dictionary has the form: >
  {'option1': 'value1', 'option2: 'value2', ...}

Consider the following: >
  let g:vimwiki_list = [{'path': '~/my_site/', 'path_html': '~/public_html/'}]

This defines one wiki located at ~/my_site/ that could be htmlized to
~/public_html/

Another example: >
  let g:vimwiki_list = [{'path': '~/my_site/', 'path_html': '~/public_html/'},
            \ {'path': '~/my_docs/', 'ext': '.mdox'}]

defines two wikis: the first as before, and the second one located in
~/my_docs/, with files that have the .mdox extension.

An empty |Dictionary| in g:vimwiki_list is the wiki with default options: >
  let g:vimwiki_list = [{},
            \ {'path': '~/my_docs/', 'ext': '.mdox'}]

For clarity, in your .vimrc file you can define wiki options using separate
|Dictionary| variables and subsequently compose them into |g:vimwiki_list|. >
    let wiki_1 = {}
    let wiki_1.path = '~/my_docs/'
    let wiki_1.html_template = '~/public_html/template.tpl'
    let wiki_1.nested_syntaxes = {'python': 'python', 'c++': 'cpp'}

    let wiki_2 = {}
    let wiki_2.path = '~/project_docs/'
    let wiki_2.index = 'main'

    let g:vimwiki_list = [wiki_1, wiki_2]
<


------------------------------------------------------------------------------
11.2 Temporary Wiki                                    *vimwiki-temporary-wiki*


The creation of temporary wikis allows you to open files that would not
normally be recognized by vimwiki.

If a file with a registered wiki extension (see |vimwiki-register-extension|)
is opened in a directory that: 1) is not listed in |g:vimwiki_list|, and 2) is
not a subdirectory of any such directory, then a temporary wiki may be created
and appended to the list of configured wikis in |g:vimwiki_list|.

In addition to vimwiki's editing functionality, the temporary wiki enables: 1)
wiki-linking to other files in the same subtree, 2) highlighting of existing
wiki pages when |vimwiki-option-maxhi| is activated, and 3) html generation to
|vimwiki-option-path_html|.

Temporary wikis are configured using default |vimwiki-local-options|, except
for the path, extension, and syntax options.  The path and extension are set
using the file's location and extension.  The syntax is set to vimwiki's
default unless another syntax is registered via |vimwiki-register-extension|.

Use |g:vimwiki_global_ext| to turn off creation of temporary wikis.

NOTE: Vimwiki assumes that the locations of distinct wikis do not overlap.


------------------------------------------------------------------------------
11.3 Per-Wiki Options                                  *vimwiki-local-options*


*vimwiki-option-path*
------------------------------------------------------------------------------
Key             Default value~
path            ~/vimwiki/

Description~
Wiki files location: >
  let g:vimwiki_list = [{'path': '~/my_site/'}]
<

*vimwiki-option-path_html*
------------------------------------------------------------------------------
Key             Default value~
path_html       ''

Description~
Location of HTML files converted from wiki files: >
  let g:vimwiki_list = [{'path': '~/my_site/',
                       \ 'path_html': '~/html_site/'}]

If path_html is an empty string, the location is derived from
|vimwiki-option-path| by adding '_html'; i.e. for: >
  let g:vimwiki_list = [{'path': '~/okidoki/'}]

path_html will be set to '~/okidoki_html/'.


*vimwiki-option-auto_export*
------------------------------------------------------------------------------
Key             Default value     Values~
auto_export     0                 0, 1

Description~
Set this option to 1 to automatically generate the HTML file when the
corresponding wiki page is saved: >
  let g:vimwiki_list = [{'path': '~/my_site/', 'auto_export': 1}]

This will keep your HTML files up to date.

*vimwiki-option-index*
------------------------------------------------------------------------------
Key             Default value~
index           index

Description~
Name of wiki index file: >
  let g:vimwiki_list = [{'path': '~/my_site/', 'index': 'main'}]

NOTE: Do not include the extension.


*vimwiki-option-ext*
------------------------------------------------------------------------------
Key             Default value~
ext             .wiki

Description~
Extension of wiki files: >
  let g:vimwiki_list = [{'path': '~/my_site/',
                       \ 'index': 'main', 'ext': '.document'}]

<
*vimwiki-option-syntax*
------------------------------------------------------------------------------
Key             Default value     Values~
syntax          default           default, markdown, or media

Description~
Wiki syntax.  You can use different markup languages (currently: vimwiki's
default, Markdown, and MediaWiki), but only vimwiki's default markup will be
converted to HTML at the moment.

To use Markdown's wiki markup: >
  let g:vimwiki_list = [{'path': '~/my_site/',
                       \ 'syntax': 'markdown', 'ext': '.md'}]
<

*vimwiki-option-template_path*
------------------------------------------------------------------------------
Key                 Default value~
template_path       ~/vimwiki/templates/

Description~
Setup path for HTML templates: >
  let g:vimwiki_list = [{'path': '~/my_site/',
          \ 'template_path': '~/public_html/templates/',
          \ 'template_default': 'def_template',
          \ 'template_ext': '.html'}]

There could be a bunch of templates: >
    def_template.html
    index.html
    bio.html
    person.html
etc.

Each template could look like: >
    <html>
    <head>
        <link rel="Stylesheet" type="text/css" href="%root_path%style.css" />
        <title>%title%</title>
        <meta http-equiv="Content-Type" content="text/html; charset=utf-8" />
    </head>
    <body>
        <div class="content">
        %content%
        </div>
    </body>
    </html>

where
  %title% is replaced by a wiki page name or by a |vimwiki-title|
  %root_path% is replaced by a count of ../ for pages buried in subdirs:
    if you have wikilink [[dir1/dir2/dir3/my page in a subdir]] then
    %root_path% is replaced by '../../../'.

  %content% is replaced by a wiki file content.


The default template will be applied to all wiki pages unless a page specifies
a template. Consider you have wiki page named 'Maxim.wiki' and you want apply
'person.html' template to it. Just add: >
 %template person
to that page.


*vimwiki-option-template_default*
------------------------------------------------------------------------------
Key                 Default value~
template_default    default

Description~
Setup default template name (without extension).

See |vimwiki-option-template_path| for details.


*vimwiki-option-template_ext*
------------------------------------------------------------------------------
Key                 Default value~
template_ext        .html

Description~
Setup template filename extension.

See |vimwiki-option-template_path| for details.


*vimwiki-option-css_name*
------------------------------------------------------------------------------
Key             Default value~
css_name        style.css

Description~
Setup CSS file name: >
  let g:vimwiki_list = [{'path': '~/my_pages/',
          \ 'css_name': 'main.css'}]
<
or even >
  let g:vimwiki_list = [{'path': '~/my_pages/',
          \ 'css_name': 'css/main.css'}]
<


*vimwiki-option-maxhi*
------------------------------------------------------------------------------
Key             Default value     Values~
maxhi           0                 0, 1

Description~
Non-existent wiki links highlighting can be quite slow. If you still want it,
set maxhi to 1: >
  let g:vimwiki_list = [{'path': '~/my_site/', 'maxhi': 1}]

This disables filesystem checks for wiki links.


*vimwiki-option-nested_syntaxes*
------------------------------------------------------------------------------
Key             Default value     Values~
nested_syntaxes {}                pairs of highlight keyword and vim filetype

Description~
You can configure preformatted text to be highlighted with any syntax
available for vim.
For example the following setup in your vimrc: >
  let wiki = {}
  let wiki.path = '~/my_wiki/'
  let wiki.nested_syntaxes = {'python': 'python', 'c++': 'cpp'}
  let g:vimwiki_list = [wiki]

would give you Python and C++ highlighting in: >
 {{{class="brush: python"
 for i in range(1, 5):
     print(i)
 }}}

 {{{class="brush: c++"
 #include "helloworld.h"
 int helloworld()
 {
    printf("hello world");
 }
 }}}

or in: >
 {{{c++
 #include "helloworld.h"
 int helloworld()
 {
    printf("hello world");
 }
 }}}

 {{{python
 for i in range(1, 5):
     print(i)
 }}}


*vimwiki-option-diary_rel_path*
------------------------------------------------------------------------------
Key             Default value~
diary_rel_path  diary/

Description~
Related to |vimwiki-option-path| path for diary wiki-files.


*vimwiki-option-diary_index*
------------------------------------------------------------------------------
Key             Default value~
diary_index     diary

Description~
Name of wiki-file that holds all links to dated wiki-files.


*vimwiki-option-diary_header*
------------------------------------------------------------------------------
Key             Default value~
diary_header    Diary

Description~
Name of the header in |vimwiki-option-diary_index| where links to dated
wiki-files are located.


*vimwiki-option-diary_sort*
------------------------------------------------------------------------------
Key             Default value   Values~
diary_sort      desc            desc, asc

Description~
Sort links in a diary index page.


*vimwiki-option-custom_wiki2html*
------------------------------------------------------------------------------
Key               Default value~
custom_wiki2html  ''

Description~
The full path to an user-provided script that converts a wiki page to HTML.
Vimwiki calls the provided |vimwiki-option-custom_wiki2html| script from the
command-line, using '!' invocation.

The following arguments, in this order, are passed to the
|vimwiki-option-custom_wiki2html| script:

1. force : [0/1] overwrite an existing file
2. syntax : the syntax chosen for this wiki
3. extension : the file extension for this wiki
4. output_dir : the full path of the output directory, i.e. 'path_html'
5. input_file : the full path of the wiki page
6. css_file : the full path of the css file for this wiki
7. template_path : the full path to the wiki's templates
8. template_default : the default template name
9. template_ext : the extension of template files
10. root_path : a count of ../ for pages buried in subdirs
    if you have wikilink [[dir1/dir2/dir3/my page in a subdir]] then
    %root_path% is replaced by '../../../'.

Options 7-10 are experimental and may change in the future.  If any of these
parameters is empty, then a hyphen "-" is passed to the script in its place.

For an example and further instructions, refer to the following script:

  $VIMHOME/autoload/vimwiki/customwiki2html.sh

An alternative converter was developed by Jason6Anderson, and can
be located at http://code.google.com/p/vimwiki/issues/detail?id=384

To use the internal wiki2html converter, use an empty string (the default).

*vimwiki-option-list_margin*
------------------------------------------------------------------------------
Key               Default value~
list_margin       -1

Description~
Width of left-hand margin for lists.  When negative, the current |shiftwidth|
is used.  This affects the behavior of the list manipulation commands
|VimwikiListChangeLevel| and local mappings |vimwiki_gll|, |vimwiki_glm|,
|vimwiki_glstar|, |vimwiki_gl8|, |vimwiki_gl#|, |vimwiki_gl3|,
|vimwiki_gl-| and |vimwiki_gl1|.



------------------------------------------------------------------------------
11.4 Global Options                                   *viwmiki-global-options*


Global options are configured using the following pattern: >

    let g:option_name = option_value


-----------------------------------------------------------------------------
*g:vimwiki_hl_headers*

Highlight headers with =Reddish=, ==Greenish==, ===Blueish=== colors.

Value           Description~
1               Use VimwikiHeader1-VimwikiHeader6 group colors to highlight
                different header levels.
0               Use |hl-Title| color for headers.
Default: 0


------------------------------------------------------------------------------
*g:vimwiki_hl_cb_checked*

Checked list items can be highlighted with a color:

  * [X] the whole line can be highlighted with the option set to 1.
  * [ ] I wish vim could use strikethru.

Value           Description~
1               Highlight checked [X] check box with |group-name| "Comment".
0               Don't.

Default: 0


------------------------------------------------------------------------------
*g:vimwiki_global_ext*

Control the creation of |vimwiki-temporary-wiki|s.

If a file with a registered extension (see |vimwiki-register-extension|) is
opened in a directory that is: 1) not listed in |g:vimwiki_list|, and 2) not a
subdirectory of any such directory, then:

Value           Description~
1               make temporary wiki and append it to |g:vimwiki_list|.
0               don't make temporary wiki in that dir.

If your preferred wiki extension is .txt then you can >
    let g:vimwiki_global_ext = 0
to restrict vimwiki's operation to only those paths listed in g:vimwiki_list.
Other text files wouldn't be treated as wiki pages.

Default: 1


------------------------------------------------------------------------------
*g:vimwiki_ext2syntax* *vimwiki-register-extension*

A many-to-one map between file extensions and syntaxes whose purpose is to
register the extensions with vimwiki.

E.g.: >
  let g:vimwiki_ext2syntax = {'.md': 'markdown',
                  \ '.mkd': 'markdown',
                  \ '.wiki': 'media'}

An extension that is registered with vimwiki can trigger creation of a
|vimwiki-temporary-wiki| with the associated syntax.  File extensions used in
|g:vimwiki_list| are automatically registered with vimwiki using the default
syntax.

Default: {}

------------------------------------------------------------------------------
*g:vimwiki_auto_checkbox*

If on, creates checkbox while toggling list item.

Value           Description~
0               Do not create checkbox.
1               Create checkbox.

Default: 1

E.g.:
Press <C-Space> (|:VimwikiToggleListItem|) on a list item without checkbox to
create it: >
  * List item
Result: >
  * [ ] List item


------------------------------------------------------------------------------
*g:vimwiki_menu*

GUI menu of available wikies to select.

Value              Description~
''                 No menu
'Vimwiki'          Top level menu "Vimwiki"
'Plugin.Vimwiki'   "Vimwiki" submenu of top level menu "Plugin"
etc.

Default: 'Vimwiki'


------------------------------------------------------------------------------
*g:vimwiki_listsyms*

String of 5 symbols for list items with checkboxes.
Default value is ' .oOX'.

g:vimwiki_listsyms[0] is for 0% done items.
g:vimwiki_listsyms[4] is for 100% done items.


------------------------------------------------------------------------------
*g:vimwiki_use_mouse*

Use local mouse mappings from |vimwiki-local-mappings|.

Value           Description~
0               Do not use mouse mappings.
1               Use mouse mappings.

Default: 0


------------------------------------------------------------------------------
*g:vimwiki_folding*

Enable/disable vimwiki's folding (outline) functionality. Folding in vimwiki
can uses either the 'expr' or the 'syntax' |foldmethod| of Vim.

Value           Description~
''              Disable folding.
'expr'          Folding based on expression (folds sections and code blocks).
'syntax'        Folding based on syntax (folds sections; slower than 'expr').
'list'          Folding based on expression (folds list subitems; much slower).

Default: ''

Limitations:
  - Opening very large files may be slow when folding is enabled.
  - 'list' folding is particularly slow with larger files.
  - 'list' is intended to work with lists nicely indented with 'shiftwidth'.
  - 'syntax' is only available for the default syntax so far.


------------------------------------------------------------------------------
*g:vimwiki_list_ignore_newline*

This is HTML related.
Convert newlines to <br />s in multiline list items.

Value           Description~
0               Newlines in a list item are converted to <br />s.
1               Ignore newlines.

Default: 1


------------------------------------------------------------------------------
*g:vimwiki_use_calendar*

Create new or open existing diary wiki-file for the date selected in Calendar.
See |vimwiki-calendar|.

Value           Description~
0               Do not use calendar.
1               Use calendar.

Default: 1


------------------------------------------------------------------------------
*VimwikiLinkHandler*

A customizable link handler, |VimwikiLinkHandler|, can be defined to override
Vimwiki's opening of links.  Each recognized link, whether it is a wikilink,
wiki-include link or a weblink, is first passed to |VimwikiLinkHandler| to see
if it can be handled.  The return value 1/0 indicates success.

If the link is not handled successfully, the behaviour of Vimwiki depends on
the scheme.  Wiki:, diary: or schemeless links are opened in Vim.  All others,
including local: and file: schemes, are opened with a system default handler;
i.e. Linux (!xdg-open), Mac (!open), and Windows (!start).

You can redefine |VimwikiLinkHandler| function to do something else: >

  function! VimwikiLinkHandler(link)
    try
      let browser = 'C:\Program Files\Firefox\firefox.exe'
      execute '!start "'.browser.'" ' . a:link
      return 1
    catch
      echo "This can happen for a variety of reasons ..."
    endtry
    return 0
  endfunction

A second example handles two new schemes, 'vlocal:' and 'vfile:', which behave
similar to 'local:' and 'file:' schemes, but are always opened with Vim: >

  function! VimwikiLinkHandler(link) "{{{ Use Vim to open links with the
    " 'vlocal:' or 'vfile:' schemes.  E.g.:
    "   1) [[vfile:///~/Code/PythonProject/abc123.py]], and
    "   2) [[vlocal:./|Wiki Home]]
    let link = a:link
    if link =~ "vlocal:" || link =~ "vfile:"
      let link = link[1:]
    else
      return 0
    endif
    let [idx, scheme, path, subdir, lnk, ext, url] =
         \ vimwiki#base#resolve_scheme(link, 0)
    if g:vimwiki_debug
      echom 'LinkHandler: idx='.idx.', scheme=[v]'.scheme.', path='.path.
           \ ', subdir='.subdir.', lnk='.lnk.', ext='.ext.', url='.url
    endif
    if url == ''
      echom 'Vimwiki Error: Unable to resolve link!'
      return 0
    else
      call vimwiki#base#edit_file('tabnew', url, [], 0)
      return 1
    endif
  endfunction " }}}


-----------------------------------------------------------------------------
*VimwikiWikiIncludeHandler*~

Vimwiki includes the contents of a wiki-include URL as an image by default.

A trial feature allows you to supply your own handler for wiki-include links.
The handler should return the empty string when it does not recognize or
cannot otherwise convert the link.  A customized handler might look like this: >

  " Convert {{URL|#|ID}} -> URL#ID
  function! VimwikiWikiIncludeHandler(value) "{{{
    let str = a:value

    " complete URL
    let url_0 = matchstr(str, g:vimwiki_rxWikiInclMatchUrl)
    " URL parts
    let [scheme, path, subdir, lnk, ext, url] =
          \ vimwiki#base#resolve_scheme(url_0, VimwikiGet('ext'))
    let arg1 = matchstr(str, VimwikiWikiInclMatchArg(1))
    let arg2 = matchstr(str, VimwikiWikiInclMatchArg(2))

    if arg1 =~ '#'
      return url.'#'.arg2
    endif

    " Return the empty string when unable to process link
    return ''
  endfunction "}}}
<

------------------------------------------------------------------------------
*g:vimwiki_table_mappings*

Enable/disable table mappings for INSERT mode.

Value           Description~
0               Disable table mappings.
1               Enable table mappings.

Default: 1


------------------------------------------------------------------------------
*g:vimwiki_table_auto_fmt*

Enable/disable table auto formatting after leaving INSERT mode.

Value           Description~
0               Disable table auto formatting.
1               Enable table auto formatting.

Default: 1


------------------------------------------------------------------------------
*g:vimwiki_w32_dir_enc*

Convert directory name from current |encoding| into 'g:vimwiki_w32_dir_enc'
before it is created.

If you have 'enc=utf-8' and set up >
    let g:vimwiki_w32_dir_enc = 'cp1251'
<
then following the next link with <CR>: >
    [[привет/мир]]
>
would convert utf-8 'привет' to cp1251 and create directory with that name.

Default: ''


------------------------------------------------------------------------------
*g:vimwiki_CJK_length*

Use special method to calculate correct length of the strings with double-wide
characters (to align table cells properly).

Value           Description~
0               Do not use it.
1               Use it.

Default: 0

Note: Vim73 has a new function |strdisplaywidth|, so for Vim73 users this
option is obsolete.


------------------------------------------------------------------------------
*g:vimwiki_dir_link*

This option is about what to do with links to directories -- [[directory/]],
[[papers/]], etc.

Value           Description~
''              Open 'directory/' using standard netrw plugin.
'index'         Open 'directory/index.wiki', create if needed.
'main'          Open 'directory/main.wiki', create if needed.
etc.

Default: '' (empty string)


------------------------------------------------------------------------------
*g:vimwiki_html_header_numbering*

Set this option if you want headers to be auto-numbered in HTML.

E.g.: >
    1 Header1
    1.1 Header2
    1.2 Header2
    1.2.1 Header3
    1.2.2 Header3
    1.3 Header2
    2 Header1
    3 Header1
etc.

Value           Description~
0               Header numbering is off.
1               Header numbering is on. Headers are numbered starting from
                header level 1.
2               Header numbering is on. Headers are numbered starting from
                header level 2.
etc.
Example when g:vimwiki_html_header_numbering = 2: >
    Header1
    1 Header2
    2 Header2
    2.1 Header3
    2.1.1 Header4
    2.1.2 Header4
    2.2 Header3
    3 Header2
    4 Header2
etc.

Default: 0


------------------------------------------------------------------------------
*g:vimwiki_html_header_numbering_sym*

Ending symbol for |g:vimwiki_html_header_numbering|.

Value           Description~
'.'             Dot will be added after a header's number.
')'             Closing bracket will be added after a header's number.
etc.

With
    let g:vimwiki_html_header_numbering_sym = '.'
headers would look like: >
    1. Header1
    1.1. Header2
    1.2. Header2
    1.2.1. Header3
    1.2.2. Header3
    1.3. Header2
    2. Header1
    3. Header1


Default: '' (empty)


------------------------------------------------------------------------------
*g:vimwiki_valid_html_tags*

Case-insensitive comma separated list of HTML tags that can be used in vimwiki.

Default: 'b,i,s,u,sub,sup,kbd,br,hr'


------------------------------------------------------------------------------
*g:vimwiki_user_htmls*

Comma-separated list of HTML files that have no corresponding wiki files and
should not be deleted after |:VimwikiAll2HTML|.

Default: ''

Example:
Consider you have 404.html and search.html in your vimwiki 'path_html'.
With: >
    let g:vimwiki_user_htmls = '404.html,search.html'
they would not be deleted after |:VimwikiAll2HTML|.


------------------------------------------------------------------------------
*g:vimwiki_conceallevel*

In vim73 |conceallevel| is local to window, thus if you open viwmiki buffer in
a new tab or window, it would be set to default value.

Vimwiki sets |conceallevel| to g:vimwiki_conceallevel everytime vimwiki buffer
is entered.

With default settings, Vimwiki conceals one-character markers, shortens long
URLs and hides markers and URL for links that have a description.

Default: 2


------------------------------------------------------------------------------
*g:vimwiki_autowriteall*

In vim |autowriteall| is a global setting. With g:vimwiki_autowriteall vimwiki
makes it local to its buffers.

Value           Description~
0               autowriteall is off
1               autowriteall is on

Default: 1


------------------------------------------------------------------------------
*g:vimwiki_url_maxsave*

Setting the value of |g:vimwiki_url_maxsave| to 0 will prevent any link
shortening: you will see the full URL in all types of links, with no parts
being concealed. Concealing of one-character markers is not affected.

When positive, the value determines the maximum number of characters that
are retained at the end after concealing the middle part of a long URL.
It could be less: in case one of the characters /,#,? is found near the end,
the URL will be concealed up to the last occurrence of that character.

Note:
  * The conceal feature works only with Vim >= 7.3.
  * When using the default |wrap| option of Vim, the effect of concealed links
    is not always pleasing, because the visible text on longer lines with
    a lot of concealed parts may appear to be strangely broken across several
    lines. This is a limitation of Vim's |conceal| feature.
  * Many color schemes do not define an unobtrusive color for the Conceal
    highlight group - this might be quite noticeable on shortened URLs.


Default: 15


------------------------------------------------------------------------------
*g:vimwiki_debug*

Controls verbosity of debugging output, for example, the diagnostic
information about HTML conversion.

Value           Description~
0               Do not show debug messages.
1               Show debug messages.

Default: 0


------------------------------------------------------------------------------
*g:vimwiki_diary_months*

It is a |Dictionary| with the numbers of months and corresponding names. Diary
uses it.

Redefine it in your .vimrc to get localized months in your diary:
let g:vimwiki_diary_months = {
      \ 1: 'Январь', 2: 'Февраль', 3: 'Март',
      \ 4: 'Апрель', 5: 'Май', 6: 'Июнь',
      \ 7: 'Июль', 8: 'Август', 9: 'Сентябрь',
      \ 10: 'Октябрь', 11: 'Ноябрь', 12: 'Декабрь'
      \ }

Default:
let g:vimwiki_diary_months = {
      \ 1: 'January', 2: 'February', 3: 'March',
      \ 4: 'April', 5: 'May', 6: 'June',
      \ 7: 'July', 8: 'August', 9: 'September',
      \ 10: 'October', 11: 'November', 12: 'December'
      \ }


==============================================================================
12. Help                                                        *vimwiki-help*

Your help in making vimwiki better is really appreciated!
Any help, whether it is a spelling correction or a code snippet to patch --
everything is welcomed.

Issues can be filed at http://code.google.com/p/vimwiki/issues .


==============================================================================
13. Developers                                            *vimwiki-developers*

    - Maxim Kim <habamax@gmail.com> as original author.
    - Stuart Andrews
    - Tomas Pospichal
    - See the http://code.google.com/p/vimwiki/people/list for the others.

Web: http://code.google.com/p/vimwiki/
Mail-List: https://groups.google.com/forum/#!forum/vimwiki
Vim plugins: http://www.vim.org/scripts/script.php?script_id=2226


==============================================================================
14. Changelog                                              *vimwiki-changelog*

2.1~

    * Concealing of links can be turned off - set |g:vimwiki_url_maxsave| to 0.
      The option g:vimwiki_url_mingain was removed
    * |g:vimwiki_folding| also accepts value 'list'; with 'expr' both sections
      and code blocks folded, g:vimwiki_fold_lists option was removed
    * Issue 261: Syntax folding is back. |g:vimwiki_folding| values are
      changed to '', 'expr', 'syntax'.
    * Issue 372: Ignore case in g:vimwiki_valid_html_tags
    * Issue 374: Make autowriteall local to vimwiki. It is not 100% local
      though.
    * Issue 384: Custom_wiki2html script now receives templating arguments
    * Issue 393: Custom_wiki2html script path can contain tilde character
    * Issue 392: Custom_wiki2html arguments are quoted, e.g names with spaces
    * Various small bug fixes.

2.0.1 'stu'~

    * Follow (i.e. open target of) markdown reference-style links.
    * Bug fixes.


2.0 'stu'~

This release is partly incompatible with previous.

Summary ~

    * Quick page-link creation.
    * Redesign of link syntaxes (!)
        * No more CamelCase links. Check the ways to convert them
          https://groups.google.com/forum/?fromgroups#!topic/vimwiki/NdS9OBG2dys
        * No more [[link][desc]] links.
        * No more [http://link description] links.
        * No more plain image links. Use transclusions.
        * No more image links identified by extension. Use transclusions.
    * Interwiki links. See |vimwiki-syntax-schemes|.
    * Link schemes. See |vimwiki-syntax-schemes|.
    * Transclusions. See |vimwiki-syntax-transclude|.
    * Normalize link command. See |vimwiki_+|.
    * Improved diary organization and generation. See |vimwiki-diary|.
    * List manipulation. See |vimwiki-list-manipulation|.
    * Markdown support.
    * Mathjax support. See |vimwiki-syntax-math|.
    * Improved handling of special characters and punctuation in filenames and
      urls.
    * Back links command: list links referring to the current page.
    * Highlighting nonexisted links are off by default.
    * Table syntax change. Row separator uses | instead of +.
    * Fold multilined list items.
    * Custom wiki to HTML converters. See |vimwiki-option-custom_wiki2html|.
    * Conceal long weblinks. See g:vimwiki_url_mingain.
    * Option to disable table mappings. See |g:vimwiki_table_mappings|.

For detailed information see issues list on
http://code.google.com/p/vimwiki/issues/list


1.2~
    * Issue 70: Table spanning cell support.
    * Issue 72: Do not convert again for unchanged file. |:VimwikiAll2HTML|
      converts only changed wiki files.
    * Issue 117: |VimwikiDiaryIndex| command that opens diary index wiki page.
    * Issue 120: Links in headers are not highlighted in vimwiki but are
      highlighted in HTML.
    * Issue 138: Added possibility to remap table-column move bindings. See
      |:VimwikiTableMoveColumnLeft| and |:VimwikiTableMoveColumnRight|
      commands. For remap instructions see |vimwiki_<A-Left>|
      and |vimwiki_<A-Right>|.
    * Issue 125: Problem with 'o' command given while at the of the file.
    * Issue 131: FileType is not set up when GUIEnter autocommand is used in
      vimrc. Use 'nested' in 'au GUIEnter * nested VimwikiIndex'
    * Issue 132: Link to perl (or any non-wiki) file in vimwiki subdirectory
      doesn't work as intended.
    * Issue 135: %title and %toc used together cause TOC to appear in an
      unexpected place in HTML.
    * Issue 139: |:VimwikiTabnewLink| command is added.
    * Fix of g:vimwiki_stripsym = '' (i.e. an empty string) -- it removes bad
      symbols from filenames.
    * Issue 145: With modeline 'set ft=vimwiki' links are not correctly
      highlighted when open wiki files.
    * Issue 146: Filetype difficulty with ".txt" as a vimwiki extension.
    * Issue 148: There are no mailto links.
    * Issue 151: Use location list instead of quickfix list for :VimwikiSearch
      command result. Use :lopen instead of :copen, :lnext instead of :cnext
      etc.
    * Issue 152: Add the list of HTML files that would not be deleted after
      |:VimwikiAll2HTML|.
    * Issue 153: Delete HTML files that has no corresponding wiki ones with
      |:VimwikiAll2HTML|.
    * Issue 156: Add multiple HTML templates. See
      |vimwiki-option-template_path|. Options html_header and html_footer are
      no longer exist.
    * Issue 173: When virtualedit=all option is enabled the 'o' command behave
      strange.
    * Issue 178: Problem with alike wikie's paths.
    * Issue 182: Browser command does not quote url.
    * Issue 183: Spelling error highlighting is not possible with nested
      syntaxes.
    * Issue 184: Wrong foldlevel in some cases.
    * Issue 195: Page renaming issue.
    * Issue 196: vim: modeline bug -- syn=vim doesn't work.
    * Issue 199: Generated HTML for sublists is invalid.
    * Issue 200: Generated HTML for todo lists does not show completion status
      the fix relies on CSS, thus your old stylesheets need to be updated!;
      may not work in obsolete browsers or font-deficient systems.
    * Issue 205: Block code: highlighting differs from processing. Inline code
      block {{{ ... }}} is removed. Use `...` instead.
    * Issue 208: Default highlight colors are problematic in many
      colorschemes. Headers are highlighted as |hl-Title| by default, use
      |g:vimwiki_hl_headers| to restore previous default Red, Green, Blue or
      custom header colors. Some other changes in highlighting.
    * Issue 209: Wild comments slow down html generation. Comments are
      changed, use %% to comment out entire line.
    * Issue 210: HTML: para enclose header.
    * Issue 214: External links containing Chinese characters get trimmed.
    * Issue 218: Command to generate HTML file and open it in webbrowser. See
      |:Vimwiki2HTMLBrowse|(bind to <leader>whh)
    * NEW: Added <Leader>wh mapping to call |:Vimwiki2HTML|


...

39 releases

...

0.1~
    * First public version.

==============================================================================
15. License                                                  *vimwiki-license*

The MIT Licence
http://www.opensource.org/licenses/mit-license.php

Copyright (c) 2008-2010 Maxim Kim

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.



 vim:tw=78:ts=8:ft=help
syntax/vimwiki_markdown.vim	[[[1
89
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki syntax file
" Default syntax
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

" placeholder for math environments
let b:vimwiki_mathEnv = ""

" text: $ equation_inline $
let g:vimwiki_rxEqIn = '\$[^$`]\+\$'
let g:vimwiki_char_eqin = '\$'

" text: *strong*
" let g:vimwiki_rxBold = '\*[^*]\+\*'
let g:vimwiki_rxBold = '\%(^\|\s\|[[:punct:]]\)\@<='.
      \'\*'.
      \'\%([^*`[:space:]][^*`]*[^*`[:space:]]\|[^*`[:space:]]\)'.
      \'\*'.
      \'\%([[:punct:]]\|\s\|$\)\@='
let g:vimwiki_char_bold = '*'

" text: _emphasis_
" let g:vimwiki_rxItalic = '_[^_]\+_'
let g:vimwiki_rxItalic = '\%(^\|\s\|[[:punct:]]\)\@<='.
      \'_'.
      \'\%([^_`[:space:]][^_`]*[^_`[:space:]]\|[^_`[:space:]]\)'.
      \'_'.
      \'\%([[:punct:]]\|\s\|$\)\@='
let g:vimwiki_char_italic = '_'

" text: *_bold italic_* or _*italic bold*_
let g:vimwiki_rxBoldItalic = '\%(^\|\s\|[[:punct:]]\)\@<='.
      \'\*_'.
      \'\%([^*_`[:space:]][^*_`]*[^*_`[:space:]]\|[^*_`[:space:]]\)'.
      \'_\*'.
      \'\%([[:punct:]]\|\s\|$\)\@='
let g:vimwiki_char_bolditalic = '\*_'

let g:vimwiki_rxItalicBold = '\%(^\|\s\|[[:punct:]]\)\@<='.
      \'_\*'.
      \'\%([^*_`[:space:]][^*_`]*[^*_`[:space:]]\|[^*_`[:space:]]\)'.
      \'\*_'.
      \'\%([[:punct:]]\|\s\|$\)\@='
let g:vimwiki_char_italicbold = '_\*'

" text: `code`
let g:vimwiki_rxCode = '`[^`]\+`'
let g:vimwiki_char_code = '`'

" text: ~~deleted text~~
let g:vimwiki_rxDelText = '\~\~[^~`]\+\~\~'
let g:vimwiki_char_deltext = '\~\~'

" text: ^superscript^
let g:vimwiki_rxSuperScript = '\^[^^`]\+\^'
let g:vimwiki_char_superscript = '^'

" text: ,,subscript,,
let g:vimwiki_rxSubScript = ',,[^,`]\+,,'
let g:vimwiki_char_subscript = ',,'

" generic headers
let g:vimwiki_rxH = '#'
let g:vimwiki_symH = 0



" <hr>, horizontal rule
let g:vimwiki_rxHR = '^-----*$'

" Tables. Each line starts and ends with '|'; each cell is separated by '|'
let g:vimwiki_rxTableSep = '|'

" List items start with optional whitespace(s) then '* ' or '1. ', '2. ', etc.
let g:vimwiki_rxListBullet = '^\s*[*+-]\s'
let g:vimwiki_rxListNumber = '^\s*[0-9]\+\.\s'

let g:vimwiki_rxListDefine = '::\%(\s\|$\)'

" Preformatted text
let g:vimwiki_rxPreStart = '```'
let g:vimwiki_rxPreEnd = '```'

" Math block
let g:vimwiki_rxMathStart = '\$\$'
let g:vimwiki_rxMathEnd = '\$\$'

let g:vimwiki_rxComment = '^\s*%%.*$'
syntax/vimwiki_media.vim	[[[1
71
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki syntax file
" MediaWiki syntax
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

" placeholder for math environments
let b:vimwiki_mathEnv = ""

" text: $ equation_inline $
let g:vimwiki_rxEqIn = '\$[^$`]\+\$'
let g:vimwiki_char_eqin = '\$'

" text: '''strong'''
let g:vimwiki_rxBold = "'''[^']\\+'''"
let g:vimwiki_char_bold = "'''"

" text: ''emphasis''
let g:vimwiki_rxItalic = "''[^']\\+''"
let g:vimwiki_char_italic = "''"

" text: '''''strong italic'''''
let g:vimwiki_rxBoldItalic = "'''''[^']\\+'''''"
let g:vimwiki_rxItalicBold = g:vimwiki_rxBoldItalic
let g:vimwiki_char_bolditalic = "'''''"
let g:vimwiki_char_italicbold = g:vimwiki_char_bolditalic

" text: `code`
let g:vimwiki_rxCode = '`[^`]\+`'
let g:vimwiki_char_code = '`'

" text: ~~deleted text~~
let g:vimwiki_rxDelText = '\~\~[^~]\+\~\~'
let g:vimwiki_char_deltext = '\~\~'

" text: ^superscript^
let g:vimwiki_rxSuperScript = '\^[^^]\+\^'
let g:vimwiki_char_superscript = '^'

" text: ,,subscript,,
let g:vimwiki_rxSubScript = ',,[^,]\+,,'
let g:vimwiki_char_subscript = ',,'

" generic headers
let g:vimwiki_rxH = '='
let g:vimwiki_symH = 1



" <hr>, horizontal rule
let g:vimwiki_rxHR = '^-----*$'

" Tables. Each line starts and ends with '|'; each cell is separated by '|'
let g:vimwiki_rxTableSep = '|'

" Bulleted list items start with whitespace(s), then '*'
" highlight only bullets and digits.
let g:vimwiki_rxListBullet = '^\s*\*\+\s\%([^*]*$\)\@='
let g:vimwiki_rxListNumber = '^\s*#\+\s'

let g:vimwiki_rxListDefine = '^\%(;\|:\)\s'

" Preformatted text
let g:vimwiki_rxPreStart = '<pre>'
let g:vimwiki_rxPreEnd = '<\/pre>'

" Math block
let g:vimwiki_rxMathStart = '{{\$'
let g:vimwiki_rxMathEnd = '}}\$'

let g:vimwiki_rxComment = '^\s*%%.*$'
syntax/vimwiki_default.vim	[[[1
89
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki syntax file
" Default syntax
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

" placeholder for math environments
let b:vimwiki_mathEnv = ""

" text: $ equation_inline $
let g:vimwiki_rxEqIn = '\$[^$`]\+\$'
let g:vimwiki_char_eqin = '\$'

" text: *strong*
" let g:vimwiki_rxBold = '\*[^*]\+\*'
let g:vimwiki_rxBold = '\%(^\|\s\|[[:punct:]]\)\@<='.
      \'\*'.
      \'\%([^*`[:space:]][^*`]*[^*`[:space:]]\|[^*`[:space:]]\)'.
      \'\*'.
      \'\%([[:punct:]]\|\s\|$\)\@='
let g:vimwiki_char_bold = '*'

" text: _emphasis_
" let g:vimwiki_rxItalic = '_[^_]\+_'
let g:vimwiki_rxItalic = '\%(^\|\s\|[[:punct:]]\)\@<='.
      \'_'.
      \'\%([^_`[:space:]][^_`]*[^_`[:space:]]\|[^_`[:space:]]\)'.
      \'_'.
      \'\%([[:punct:]]\|\s\|$\)\@='
let g:vimwiki_char_italic = '_'

" text: *_bold italic_* or _*italic bold*_
let g:vimwiki_rxBoldItalic = '\%(^\|\s\|[[:punct:]]\)\@<='.
      \'\*_'.
      \'\%([^*_`[:space:]][^*_`]*[^*_`[:space:]]\|[^*_`[:space:]]\)'.
      \'_\*'.
      \'\%([[:punct:]]\|\s\|$\)\@='
let g:vimwiki_char_bolditalic = '\*_'

let g:vimwiki_rxItalicBold = '\%(^\|\s\|[[:punct:]]\)\@<='.
      \'_\*'.
      \'\%([^*_`[:space:]][^*_`]*[^*_`[:space:]]\|[^*_`[:space:]]\)'.
      \'\*_'.
      \'\%([[:punct:]]\|\s\|$\)\@='
let g:vimwiki_char_italicbold = '_\*'

" text: `code`
let g:vimwiki_rxCode = '`[^`]\+`'
let g:vimwiki_char_code = '`'

" text: ~~deleted text~~
let g:vimwiki_rxDelText = '\~\~[^~`]\+\~\~'
let g:vimwiki_char_deltext = '\~\~'

" text: ^superscript^
let g:vimwiki_rxSuperScript = '\^[^^`]\+\^'
let g:vimwiki_char_superscript = '^'

" text: ,,subscript,,
let g:vimwiki_rxSubScript = ',,[^,`]\+,,'
let g:vimwiki_char_subscript = ',,'

" generic headers
let g:vimwiki_rxH = '='
let g:vimwiki_symH = 1



" <hr>, horizontal rule
let g:vimwiki_rxHR = '^-----*$'

" Tables. Each line starts and ends with '|'; each cell is separated by '|'
let g:vimwiki_rxTableSep = '|'

" List items start with optional whitespace(s) then '* ' or '# '
let g:vimwiki_rxListBullet = '^\s*[*-]\s'
let g:vimwiki_rxListNumber = '^\s*#\s'

let g:vimwiki_rxListDefine = '::\(\s\|$\)'

" Preformatted text
let g:vimwiki_rxPreStart = '{{{'
let g:vimwiki_rxPreEnd = '}}}'

" Math block
let g:vimwiki_rxMathStart = '{{\$'
let g:vimwiki_rxMathEnd = '}}\$'

let g:vimwiki_rxComment = '^\s*%%.*$'
syntax/vimwiki.vim	[[[1
621
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki syntax file
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

" Quit if syntax file is already loaded
if version < 600
  syntax clear
elseif exists("b:current_syntax")
  finish
endif
"TODO do nothing if ...? (?)
let starttime = reltime()  " start the clock
if VimwikiGet('maxhi')
  let b:existing_wikifiles = vimwiki#base#get_links('*'.VimwikiGet('ext'))
  let b:existing_wikidirs  = vimwiki#base#get_links('*/')
endif
let timescans = vimwiki#u#time(starttime)  "XXX
  "let b:xxx = 1
  "TODO ? update wikilink syntax group here if really needed (?) for :e and such
  "if VimwikiGet('maxhi')
  " ...
  "endif

" LINKS: assume this is common to all syntaxes "{{{

" LINKS: WebLinks {{{
" match URL for common protocols;
" see http://en.wikipedia.org/wiki/URI_scheme  http://tools.ietf.org/html/rfc3986
let g:vimwiki_rxWebProtocols = ''.
      \ '\%('.
        \ '\%('.
          \ '\%('.join(split(g:vimwiki_web_schemes1, '\s*,\s*'), '\|').'\):'.
          \ '\%(//\)'.
        \ '\)'.
      \ '\|'.
        \ '\%('.join(split(g:vimwiki_web_schemes2, '\s*,\s*'), '\|').'\):'.
      \ '\)'
"
let g:vimwiki_rxWeblinkUrl = g:vimwiki_rxWebProtocols .
    \ '\S\{-1,}'. '\%(([^ \t()]*)\)\='
" }}}

" }}}

" -------------------------------------------------------------------------
" Load concrete Wiki syntax: sets regexes and templates for headers and links
execute 'runtime! syntax/vimwiki_'.VimwikiGet('syntax').'.vim'
" -------------------------------------------------------------------------
let time0 = vimwiki#u#time(starttime)  "XXX

let g:vimwiki_rxListItem = '\('.
      \ g:vimwiki_rxListBullet.'\|'.g:vimwiki_rxListNumber.
      \ '\)'

" LINKS: setup of larger regexes {{{

" LINKS: setup wikilink regexps {{{
let g:vimwiki_rxWikiLinkPrefix = '[['
let g:vimwiki_rxWikiLinkSuffix = ']]'
let g:vimwiki_rxWikiLinkSeparator = '|'
" [[URL]]
let g:vimwiki_WikiLinkTemplate1 = g:vimwiki_rxWikiLinkPrefix . '__LinkUrl__'.
      \ g:vimwiki_rxWikiLinkSuffix
" [[URL|DESCRIPTION]]
let g:vimwiki_WikiLinkTemplate2 = g:vimwiki_rxWikiLinkPrefix . '__LinkUrl__'.
      \ g:vimwiki_rxWikiLinkSeparator. '__LinkDescription__'.
      \ g:vimwiki_rxWikiLinkSuffix
"
let magic_chars = '.*[]\^$'
let valid_chars = '[^\\\]]'

let g:vimwiki_rxWikiLinkPrefix = escape(g:vimwiki_rxWikiLinkPrefix, magic_chars)
let g:vimwiki_rxWikiLinkSuffix = escape(g:vimwiki_rxWikiLinkSuffix, magic_chars)
let g:vimwiki_rxWikiLinkSeparator = escape(g:vimwiki_rxWikiLinkSeparator, magic_chars)
let g:vimwiki_rxWikiLinkUrl = valid_chars.'\{-}'
let g:vimwiki_rxWikiLinkDescr = valid_chars.'\{-}'

let g:vimwiki_rxWord = '[^[:blank:]()\\]\+'

"
" [[URL]], or [[URL|DESCRIPTION]]
" a) match [[URL|DESCRIPTION]]
let g:vimwiki_rxWikiLink = g:vimwiki_rxWikiLinkPrefix.
      \ g:vimwiki_rxWikiLinkUrl.'\%('.g:vimwiki_rxWikiLinkSeparator.
      \ g:vimwiki_rxWikiLinkDescr.'\)\?'.g:vimwiki_rxWikiLinkSuffix
" b) match URL within [[URL|DESCRIPTION]]
let g:vimwiki_rxWikiLinkMatchUrl = g:vimwiki_rxWikiLinkPrefix.
      \ '\zs'. g:vimwiki_rxWikiLinkUrl.'\ze\%('. g:vimwiki_rxWikiLinkSeparator.
      \ g:vimwiki_rxWikiLinkDescr.'\)\?'.g:vimwiki_rxWikiLinkSuffix
" c) match DESCRIPTION within [[URL|DESCRIPTION]]
let g:vimwiki_rxWikiLinkMatchDescr = g:vimwiki_rxWikiLinkPrefix.
      \ g:vimwiki_rxWikiLinkUrl.g:vimwiki_rxWikiLinkSeparator.'\%('.
      \ '\zs'. g:vimwiki_rxWikiLinkDescr. '\ze\)\?'. g:vimwiki_rxWikiLinkSuffix
" }}}

" LINKS: Syntax helper {{{
let g:vimwiki_rxWikiLinkPrefix1 = g:vimwiki_rxWikiLinkPrefix.
      \ g:vimwiki_rxWikiLinkUrl.g:vimwiki_rxWikiLinkSeparator
let g:vimwiki_rxWikiLinkSuffix1 = g:vimwiki_rxWikiLinkSuffix
" }}}


" LINKS: setup of wikiincl regexps {{{
let g:vimwiki_rxWikiInclPrefix = '{{'
let g:vimwiki_rxWikiInclSuffix = '}}'
let g:vimwiki_rxWikiInclSeparator = '|'
"
" '{{__LinkUrl__}}'
let g:vimwiki_WikiInclTemplate1 = g:vimwiki_rxWikiInclPrefix . '__LinkUrl__'.
      \ g:vimwiki_rxWikiInclSuffix
" '{{__LinkUrl____LinkDescription__}}'
let g:vimwiki_WikiInclTemplate2 = g:vimwiki_rxWikiInclPrefix . '__LinkUrl__'.
      \ '__LinkDescription__'.
      \ g:vimwiki_rxWikiInclSuffix

let valid_chars = '[^\\\}]'

let g:vimwiki_rxWikiInclPrefix = escape(g:vimwiki_rxWikiInclPrefix, magic_chars)
let g:vimwiki_rxWikiInclSuffix = escape(g:vimwiki_rxWikiInclSuffix, magic_chars)
let g:vimwiki_rxWikiInclSeparator = escape(g:vimwiki_rxWikiInclSeparator, magic_chars)
let g:vimwiki_rxWikiInclUrl = valid_chars.'\{-}'
let g:vimwiki_rxWikiInclArg = valid_chars.'\{-}'
let g:vimwiki_rxWikiInclArgs = '\%('. g:vimwiki_rxWikiInclSeparator. g:vimwiki_rxWikiInclArg. '\)'.'\{-}'
"
"
" *. {{URL}[{...}]}  - i.e.  {{URL}}, {{URL|ARG1}}, {{URL|ARG1|ARG2}}, etc.
" *a) match {{URL}[{...}]}
let g:vimwiki_rxWikiIncl = g:vimwiki_rxWikiInclPrefix.
      \ g:vimwiki_rxWikiInclUrl.
      \ g:vimwiki_rxWikiInclArgs. g:vimwiki_rxWikiInclSuffix
" *b) match URL within {{URL}[{...}]}
let g:vimwiki_rxWikiInclMatchUrl = g:vimwiki_rxWikiInclPrefix.
      \ '\zs'. g:vimwiki_rxWikiInclUrl. '\ze'.
      \ g:vimwiki_rxWikiInclArgs. g:vimwiki_rxWikiInclSuffix
" }}}

" LINKS: Syntax helper {{{
let g:vimwiki_rxWikiInclPrefix1 = g:vimwiki_rxWikiInclPrefix.
      \ g:vimwiki_rxWikiInclUrl.g:vimwiki_rxWikiInclSeparator
let g:vimwiki_rxWikiInclSuffix1 = g:vimwiki_rxWikiInclArgs.
      \ g:vimwiki_rxWikiInclSuffix
" }}}

" LINKS: Setup weblink regexps {{{
" 0. URL : free-standing links: keep URL UR(L) strip trailing punct: URL; URL) UR(L))
" let g:vimwiki_rxWeblink = '[\["(|]\@<!'. g:vimwiki_rxWeblinkUrl .
      " \ '\%([),:;.!?]\=\%([ \t]\|$\)\)\@='
" Maxim:
" Simplify free-standing links: URL starts with non(letter|digit)scheme till
" the whitespace.
" Stuart, could you check it with markdown templated links? [](http://...), as
" the last bracket is the part of URL now?
let g:vimwiki_rxWeblink = '[[:alnum:]]\@<!'. g:vimwiki_rxWeblinkUrl . '\S*'
" 0a) match URL within URL
let g:vimwiki_rxWeblinkMatchUrl = g:vimwiki_rxWeblink
" 0b) match DESCRIPTION within URL
let g:vimwiki_rxWeblinkMatchDescr = ''
" }}}


" LINKS: Setup anylink regexps {{{
let g:vimwiki_rxAnyLink = g:vimwiki_rxWikiLink.'\|'.
      \ g:vimwiki_rxWikiIncl.'\|'.g:vimwiki_rxWeblink
" }}}


" }}} end of Links

" LINKS: highlighting is complicated due to "nonexistent" links feature {{{
function! s:add_target_syntax_ON(target, type) " {{{
  if g:vimwiki_debug > 1
    echom '[vimwiki_debug] syntax target > '.a:target
  endif
  let prefix0 = 'syntax match '.a:type.' `'
  let suffix0 = '` display contains=@NoSpell,VimwikiLinkRest,'.a:type.'Char'
  let prefix1 = 'syntax match '.a:type.'T `'
  let suffix1 = '` display contained'
  execute prefix0. a:target. suffix0
  execute prefix1. a:target. suffix1
endfunction "}}}

function! s:add_target_syntax_OFF(target) " {{{
  if g:vimwiki_debug > 1
    echom '[vimwiki_debug] syntax target > '.a:target
  endif
  let prefix0 = 'syntax match VimwikiNoExistsLink `'
  let suffix0 = '` display contains=@NoSpell,VimwikiLinkRest,VimwikiLinkChar'
  let prefix1 = 'syntax match VimwikiNoExistsLinkT `'
  let suffix1 = '` display contained'
  execute prefix0. a:target. suffix0
  execute prefix1. a:target. suffix1
endfunction "}}}

function! s:highlight_existing_links() "{{{
  " Wikilink
  " Conditional highlighting that depends on the existence of a wiki file or
  "   directory is only available for *schemeless* wiki links
  " Links are set up upon BufEnter (see plugin/...)
  let safe_links = vimwiki#base#file_pattern(b:existing_wikifiles)
  " Wikilink Dirs set up upon BufEnter (see plugin/...)
  let safe_dirs = vimwiki#base#file_pattern(b:existing_wikidirs)

  " match [[URL]]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLinkTemplate1,
        \ safe_links, g:vimwiki_rxWikiLinkDescr, '')
  call s:add_target_syntax_ON(target, 'VimwikiLink')
  " match [[URL|DESCRIPTION]]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLinkTemplate2,
        \ safe_links, g:vimwiki_rxWikiLinkDescr, '')
  call s:add_target_syntax_ON(target, 'VimwikiLink')

  " match {{URL}}
  let target = vimwiki#base#apply_template(g:vimwiki_WikiInclTemplate1,
        \ safe_links, g:vimwiki_rxWikiInclArgs, '')
  call s:add_target_syntax_ON(target, 'VimwikiLink')
  " match {{URL|...}}
  let target = vimwiki#base#apply_template(g:vimwiki_WikiInclTemplate2,
        \ safe_links, g:vimwiki_rxWikiInclArgs, '')
  call s:add_target_syntax_ON(target, 'VimwikiLink')
  " match [[DIRURL]]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLinkTemplate1,
        \ safe_dirs, g:vimwiki_rxWikiLinkDescr, '')
  call s:add_target_syntax_ON(target, 'VimwikiLink')
  " match [[DIRURL|DESCRIPTION]]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLinkTemplate2,
        \ safe_dirs, g:vimwiki_rxWikiLinkDescr, '')
  call s:add_target_syntax_ON(target, 'VimwikiLink')
endfunction "}}}


" use max highlighting - could be quite slow if there are too many wikifiles
if VimwikiGet('maxhi')
  " WikiLink
  call s:add_target_syntax_OFF(g:vimwiki_rxWikiLink)
  " WikiIncl
  call s:add_target_syntax_OFF(g:vimwiki_rxWikiIncl)

  " Subsequently, links verified on vimwiki's path are highlighted as existing
  let time01 = vimwiki#u#time(starttime)  "XXX
  call s:highlight_existing_links()
  let time02 = vimwiki#u#time(starttime)  "XXX
else
  let time01 = vimwiki#u#time(starttime)  "XXX
  " Wikilink
  call s:add_target_syntax_ON(g:vimwiki_rxWikiLink, 'VimwikiLink')
  " WikiIncl
  call s:add_target_syntax_ON(g:vimwiki_rxWikiIncl, 'VimwikiLink')
  let time02 = vimwiki#u#time(starttime)  "XXX
endif

" Weblink
call s:add_target_syntax_ON(g:vimwiki_rxWeblink, 'VimwikiLink')

" WikiLink
" All remaining schemes are highlighted automatically
let rxSchemes = '\%('.
      \ join(split(g:vimwiki_schemes, '\s*,\s*'), '\|').'\|'.
      \ join(split(g:vimwiki_web_schemes1, '\s*,\s*'), '\|').
      \ '\):'

" a) match [[nonwiki-scheme-URL]]
let target = vimwiki#base#apply_template(g:vimwiki_WikiLinkTemplate1,
      \ rxSchemes.g:vimwiki_rxWikiLinkUrl, g:vimwiki_rxWikiLinkDescr, '')
call s:add_target_syntax_ON(target, 'VimwikiLink')
" b) match [[nonwiki-scheme-URL|DESCRIPTION]]
let target = vimwiki#base#apply_template(g:vimwiki_WikiLinkTemplate2,
      \ rxSchemes.g:vimwiki_rxWikiLinkUrl, g:vimwiki_rxWikiLinkDescr, '')
call s:add_target_syntax_ON(target, 'VimwikiLink')

" a) match {{nonwiki-scheme-URL}}
let target = vimwiki#base#apply_template(g:vimwiki_WikiInclTemplate1,
      \ rxSchemes.g:vimwiki_rxWikiInclUrl, g:vimwiki_rxWikiInclArgs, '')
call s:add_target_syntax_ON(target, 'VimwikiLink')
" b) match {{nonwiki-scheme-URL}[{...}]}
let target = vimwiki#base#apply_template(g:vimwiki_WikiInclTemplate2,
      \ rxSchemes.g:vimwiki_rxWikiInclUrl, g:vimwiki_rxWikiInclArgs, '')
call s:add_target_syntax_ON(target, 'VimwikiLink')

" }}}


" generic headers "{{{
if g:vimwiki_symH
  "" symmetric
  for i in range(1,6)
    let g:vimwiki_rxH{i}_Template = repeat(g:vimwiki_rxH, i).' __Header__ '.repeat(g:vimwiki_rxH, i)
    let g:vimwiki_rxH{i} = '^\s*'.g:vimwiki_rxH.'\{'.i.'}[^'.g:vimwiki_rxH.'].*[^'.g:vimwiki_rxH.']'.g:vimwiki_rxH.'\{'.i.'}\s*$'
    let g:vimwiki_rxH{i}_Start = '^\s*'.g:vimwiki_rxH.'\{'.i.'}[^'.g:vimwiki_rxH.'].*[^'.g:vimwiki_rxH.']'.g:vimwiki_rxH.'\{'.i.'}\s*$'
    let g:vimwiki_rxH{i}_End = '^\s*'.g:vimwiki_rxH.'\{1,'.i.'}[^'.g:vimwiki_rxH.'].*[^'.g:vimwiki_rxH.']'.g:vimwiki_rxH.'\{1,'.i.'}\s*$'
  endfor
  let g:vimwiki_rxHeader = '^\s*\('.g:vimwiki_rxH.'\{1,6}\)\zs[^'.g:vimwiki_rxH.'].*[^'.g:vimwiki_rxH.']\ze\1\s*$'
else
  " asymmetric
  for i in range(1,6)
    let g:vimwiki_rxH{i}_Template = repeat(g:vimwiki_rxH, i).' __Header__'
    let g:vimwiki_rxH{i} = '^\s*'.g:vimwiki_rxH.'\{'.i.'}[^'.g:vimwiki_rxH.'].*$'
    let g:vimwiki_rxH{i}_Start = '^\s*'.g:vimwiki_rxH.'\{'.i.'}[^'.g:vimwiki_rxH.'].*$'
    let g:vimwiki_rxH{i}_End = '^\s*'.g:vimwiki_rxH.'\{1,'.i.'}[^'.g:vimwiki_rxH.'].*$'
  endfor
  let g:vimwiki_rxHeader = '^\s*\('.g:vimwiki_rxH.'\{1,6}\)\zs[^'.g:vimwiki_rxH.'].*\ze$'
endif

" Header levels, 1-6
for i in range(1,6)
  execute 'syntax match VimwikiHeader'.i.' /'.g:vimwiki_rxH{i}.'/ contains=VimwikiTodo,VimwikiHeaderChar,VimwikiNoExistsLink,VimwikiCode,VimwikiLink,@Spell'
  execute 'syntax region VimwikiH'.i.'Folding start=/'.g:vimwiki_rxH{i}_Start.
        \ '/ end=/'.g:vimwiki_rxH{i}_End.'/me=s-1 transparent fold'
endfor


" }}}

" possibly concealed chars " {{{
let conceal = exists("+conceallevel") ? ' conceal' : ''

execute 'syn match VimwikiEqInChar contained /'.g:vimwiki_char_eqin.'/'.conceal
execute 'syn match VimwikiBoldChar contained /'.g:vimwiki_char_bold.'/'.conceal
execute 'syn match VimwikiItalicChar contained /'.g:vimwiki_char_italic.'/'.conceal
execute 'syn match VimwikiBoldItalicChar contained /'.g:vimwiki_char_bolditalic.'/'.conceal
execute 'syn match VimwikiItalicBoldChar contained /'.g:vimwiki_char_italicbold.'/'.conceal
execute 'syn match VimwikiCodeChar contained /'.g:vimwiki_char_code.'/'.conceal
execute 'syn match VimwikiDelTextChar contained /'.g:vimwiki_char_deltext.'/'.conceal
execute 'syn match VimwikiSuperScript contained /'.g:vimwiki_char_superscript.'/'.conceal
execute 'syn match VimwikiSubScript contained /'.g:vimwiki_char_subscript.'/'.conceal
" }}}

" concealed link parts " {{{
if g:vimwiki_debug > 1
  echom 'WikiLink Prefix: '.g:vimwiki_rxWikiLinkPrefix
  echom 'WikiLink Suffix: '.g:vimwiki_rxWikiLinkSuffix
  echom 'WikiLink Prefix1: '.g:vimwiki_rxWikiLinkPrefix1
  echom 'WikiLink Suffix1: '.g:vimwiki_rxWikiLinkSuffix1
  echom 'WikiIncl Prefix: '.g:vimwiki_rxWikiInclPrefix1
  echom 'WikiIncl Suffix: '.g:vimwiki_rxWikiInclSuffix1
endif

" define the conceal attribute for links only if Vim is new enough to handle it
" and the user has g:vimwiki_url_maxsave > 0

let options = ' contained transparent contains=NONE'
"
" A shortener for long URLs: LinkRest (a middle part of the URL) is concealed
" VimwikiLinkRest group is left undefined if link shortening is not desired
if exists("+conceallevel") && g:vimwiki_url_maxsave > 0
  let options .= conceal
  execute 'syn match VimwikiLinkRest `\%(///\=[^/ \t]\+/\)\zs\S\+\ze'
        \.'\%([/#?]\w\|\S\{'.g:vimwiki_url_maxsave.'}\)`'.' cchar=~'.options
endif

" VimwikiLinkChar is for syntax markers (and also URL when a description
" is present) and may be concealed

" conceal wikilinks
execute 'syn match VimwikiLinkChar /'.g:vimwiki_rxWikiLinkPrefix.'/'.options
execute 'syn match VimwikiLinkChar /'.g:vimwiki_rxWikiLinkSuffix.'/'.options
execute 'syn match VimwikiLinkChar /'.g:vimwiki_rxWikiLinkPrefix1.'/'.options
execute 'syn match VimwikiLinkChar /'.g:vimwiki_rxWikiLinkSuffix1.'/'.options

" conceal wikiincls
execute 'syn match VimwikiLinkChar /'.g:vimwiki_rxWikiInclPrefix.'/'.options
execute 'syn match VimwikiLinkChar /'.g:vimwiki_rxWikiInclSuffix.'/'.options
execute 'syn match VimwikiLinkChar /'.g:vimwiki_rxWikiInclPrefix1.'/'.options
execute 'syn match VimwikiLinkChar /'.g:vimwiki_rxWikiInclSuffix1.'/'.options
" }}}

" non concealed chars " {{{
execute 'syn match VimwikiHeaderChar contained /\%(^\s*'.g:vimwiki_rxH.'\+\)\|\%('.g:vimwiki_rxH.'\+\s*$\)/'
execute 'syn match VimwikiEqInCharT contained /'.g:vimwiki_char_eqin.'/'
execute 'syn match VimwikiBoldCharT contained /'.g:vimwiki_char_bold.'/'
execute 'syn match VimwikiItalicCharT contained /'.g:vimwiki_char_italic.'/'
execute 'syn match VimwikiBoldItalicCharT contained /'.g:vimwiki_char_bolditalic.'/'
execute 'syn match VimwikiItalicBoldCharT contained /'.g:vimwiki_char_italicbold.'/'
execute 'syn match VimwikiCodeCharT contained /'.g:vimwiki_char_code.'/'
execute 'syn match VimwikiDelTextCharT contained /'.g:vimwiki_char_deltext.'/'
execute 'syn match VimwikiSuperScriptT contained /'.g:vimwiki_char_superscript.'/'
execute 'syn match VimwikiSubScriptT contained /'.g:vimwiki_char_subscript.'/'

" Emoticons
"syntax match VimwikiEmoticons /\%((.)\|:[()|$@]\|:-[DOPS()\]|$@]\|;)\|:'(\)/

let g:vimwiki_rxTodo = '\C\%(TODO:\|DONE:\|STARTED:\|FIXME:\|FIXED:\|XXX:\)'
execute 'syntax match VimwikiTodo /'. g:vimwiki_rxTodo .'/'
" }}}

" main syntax groups {{{

" Tables
syntax match VimwikiTableRow /^\s*|.\+|\s*$/
      \ transparent contains=VimwikiCellSeparator,
                           \ VimwikiLinkT,
                           \ VimwikiNoExistsLinkT,
                           \ VimwikiEmoticons,
                           \ VimwikiTodo,
                           \ VimwikiBoldT,
                           \ VimwikiItalicT,
                           \ VimwikiBoldItalicT,
                           \ VimwikiItalicBoldT,
                           \ VimwikiDelTextT,
                           \ VimwikiSuperScriptT,
                           \ VimwikiSubScriptT,
                           \ VimwikiCodeT,
                           \ VimwikiEqInT,
                           \ @Spell
syntax match VimwikiCellSeparator
      \ /\%(|\)\|\%(-\@<=+\-\@=\)\|\%([|+]\@<=-\+\)/ contained

" List items
execute 'syntax match VimwikiList /'.g:vimwiki_rxListBullet.'/'
execute 'syntax match VimwikiList /'.g:vimwiki_rxListNumber.'/'
execute 'syntax match VimwikiList /'.g:vimwiki_rxListDefine.'/'
" List item checkbox
"syntax match VimwikiCheckBox /\[.\?\]/
let g:vimwiki_rxCheckBox = '\s*\[['.g:vimwiki_listsyms.']\?\]\s'
" Todo lists have a checkbox
execute 'syntax match VimwikiListTodo /'.g:vimwiki_rxListBullet.g:vimwiki_rxCheckBox.'/'
execute 'syntax match VimwikiListTodo /'.g:vimwiki_rxListNumber.g:vimwiki_rxCheckBox.'/'
if g:vimwiki_hl_cb_checked
  execute 'syntax match VimwikiCheckBoxDone /'.
        \ g:vimwiki_rxListBullet.'\s*\['.g:vimwiki_listsyms[4].'\]\s.*$/'.
        \ ' contains=VimwikiNoExistsLink,VimwikiLink'
  execute 'syntax match VimwikiCheckBoxDone /'.
        \ g:vimwiki_rxListNumber.'\s*\['.g:vimwiki_listsyms[4].'\]\s.*$/'.
        \ ' contains=VimwikiNoExistsLink,VimwikiLink'
endif

execute 'syntax match VimwikiEqIn /'.g:vimwiki_rxEqIn.'/ contains=VimwikiEqInChar'
execute 'syntax match VimwikiEqInT /'.g:vimwiki_rxEqIn.'/ contained contains=VimwikiEqInCharT'

execute 'syntax match VimwikiBold /'.g:vimwiki_rxBold.'/ contains=VimwikiBoldChar,@Spell'
execute 'syntax match VimwikiBoldT /'.g:vimwiki_rxBold.'/ contained contains=VimwikiBoldCharT,@Spell'

execute 'syntax match VimwikiItalic /'.g:vimwiki_rxItalic.'/ contains=VimwikiItalicChar,@Spell'
execute 'syntax match VimwikiItalicT /'.g:vimwiki_rxItalic.'/ contained contains=VimwikiItalicCharT,@Spell'

execute 'syntax match VimwikiBoldItalic /'.g:vimwiki_rxBoldItalic.'/ contains=VimwikiBoldItalicChar,VimwikiItalicBoldChar,@Spell'
execute 'syntax match VimwikiBoldItalicT /'.g:vimwiki_rxBoldItalic.'/ contained contains=VimwikiBoldItalicChatT,VimwikiItalicBoldCharT,@Spell'

execute 'syntax match VimwikiItalicBold /'.g:vimwiki_rxItalicBold.'/ contains=VimwikiBoldItalicChar,VimwikiItalicBoldChar,@Spell'
execute 'syntax match VimwikiItalicBoldT /'.g:vimwiki_rxItalicBold.'/ contained contains=VimwikiBoldItalicCharT,VimsikiItalicBoldCharT,@Spell'

execute 'syntax match VimwikiDelText /'.g:vimwiki_rxDelText.'/ contains=VimwikiDelTextChar,@Spell'
execute 'syntax match VimwikiDelTextT /'.g:vimwiki_rxDelText.'/ contained contains=VimwikiDelTextChar,@Spell'

execute 'syntax match VimwikiSuperScript /'.g:vimwiki_rxSuperScript.'/ contains=VimwikiSuperScriptChar,@Spell'
execute 'syntax match VimwikiSuperScriptT /'.g:vimwiki_rxSuperScript.'/ contained contains=VimwikiSuperScriptCharT,@Spell'

execute 'syntax match VimwikiSubScript /'.g:vimwiki_rxSubScript.'/ contains=VimwikiSubScriptChar,@Spell'
execute 'syntax match VimwikiSubScriptT /'.g:vimwiki_rxSubScript.'/ contained contains=VimwikiSubScriptCharT,@Spell'

execute 'syntax match VimwikiCode /'.g:vimwiki_rxCode.'/ contains=VimwikiCodeChar'
execute 'syntax match VimwikiCodeT /'.g:vimwiki_rxCode.'/ contained contains=VimwikiCodeCharT'

" <hr> horizontal rule
execute 'syntax match VimwikiHR /'.g:vimwiki_rxHR.'/'

execute 'syntax region VimwikiPre start=/^\s*'.g:vimwiki_rxPreStart.
      \ '/ end=/^\s*'.g:vimwiki_rxPreEnd.'\s*$/ contains=@Spell'

execute 'syntax region VimwikiMath start=/^\s*'.g:vimwiki_rxMathStart.
      \ '/ end=/^\s*'.g:vimwiki_rxMathEnd.'\s*$/ contains=@Spell'


" placeholders
syntax match VimwikiPlaceholder /^\s*%toc\%(\s.*\)\?$/ contains=VimwikiPlaceholderParam
syntax match VimwikiPlaceholder /^\s*%nohtml\s*$/
syntax match VimwikiPlaceholder /^\s*%title\%(\s.*\)\?$/ contains=VimwikiPlaceholderParam
syntax match VimwikiPlaceholder /^\s*%template\%(\s.*\)\?$/ contains=VimwikiPlaceholderParam
syntax match VimwikiPlaceholderParam /\s.*/ contained

" html tags
if g:vimwiki_valid_html_tags != ''
  let html_tags = join(split(g:vimwiki_valid_html_tags, '\s*,\s*'), '\|')
  exe 'syntax match VimwikiHTMLtag #\c</\?\%('.html_tags.'\)\%(\s\{-1}\S\{-}\)\{-}\s*/\?>#'
  execute 'syntax match VimwikiBold #\c<b>.\{-}</b># contains=VimwikiHTMLTag'
  execute 'syntax match VimwikiItalic #\c<i>.\{-}</i># contains=VimwikiHTMLTag'
  execute 'syntax match VimwikiUnderline #\c<u>.\{-}</u># contains=VimwikiHTMLTag'

  execute 'syntax match VimwikiComment /'.g:vimwiki_rxComment.'/ contains=@Spell'
endif
" }}}

" header groups highlighting "{{{

if g:vimwiki_hl_headers == 0
  " Strangely in default colorscheme Title group is not set to bold for cterm...
  if !exists("g:colors_name")
    hi Title cterm=bold
  endif
  for i in range(1,6)
    execute 'hi def link VimwikiHeader'.i.' Title'
  endfor
else
  " default colors when headers of different levels are highlighted differently
  " not making it yet another option; needed by ColorScheme autocommand
  let g:vimwiki_hcolor_guifg_light = ['#aa5858','#507030','#1030a0','#103040','#505050','#636363']
  let g:vimwiki_hcolor_ctermfg_light = ['DarkRed','DarkGreen','DarkBlue','Black','Black','Black']
  let g:vimwiki_hcolor_guifg_dark = ['#e08090','#80e090','#6090e0','#c0c0f0','#e0e0f0','#f0f0f0']
  let g:vimwiki_hcolor_ctermfg_dark = ['Red','Green','Blue','White','White','White']
  for i in range(1,6)
    execute 'hi def VimwikiHeader'.i.' guibg=bg guifg='.g:vimwiki_hcolor_guifg_{&bg}[i-1].' gui=bold ctermfg='.g:vimwiki_hcolor_ctermfg_{&bg}[i-1].' term=bold cterm=bold'
  endfor
endif
"}}}



" syntax group highlighting "{{{

hi def link VimwikiMarkers Normal

hi def link VimwikiEqIn Number
hi def link VimwikiEqInT VimwikiEqIn

hi def VimwikiBold term=bold cterm=bold gui=bold
hi def link VimwikiBoldT VimwikiBold

hi def VimwikiItalic term=italic cterm=italic gui=italic
hi def link VimwikiItalicT VimwikiItalic

hi def VimwikiBoldItalic term=bold cterm=bold gui=bold,italic
hi def link VimwikiItalicBold VimwikiBoldItalic
hi def link VimwikiBoldItalicT VimwikiBoldItalic
hi def link VimwikiItalicBoldT VimwikiBoldItalic

hi def VimwikiUnderline gui=underline

hi def link VimwikiCode PreProc
hi def link VimwikiCodeT VimwikiCode

hi def link VimwikiPre PreProc
hi def link VimwikiPreT VimwikiPre

hi def link VimwikiMath Number
hi def link VimwikiMathT VimwikiMath

hi def link VimwikiNoExistsLink SpellBad
hi def link VimwikiNoExistsLinkT VimwikiNoExistsLink

hi def link VimwikiLink Underlined
hi def link VimwikiLinkT VimwikiLink

hi def link VimwikiList Identifier
hi def link VimwikiListTodo VimwikiList
"hi def link VimwikiCheckBox VimwikiList
hi def link VimwikiCheckBoxDone Comment
hi def link VimwikiEmoticons Character
hi def link VimwikiHR Identifier

hi def link VimwikiDelText Constant
hi def link VimwikiDelTextT VimwikiDelText

hi def link VimwikiSuperScript Number
hi def link VimwikiSuperScriptT VimwikiSuperScript

hi def link VimwikiSubScript Number
hi def link VimwikiSubScriptT VimwikiSubScript

hi def link VimwikiTodo Todo
hi def link VimwikiComment Comment

hi def link VimwikiPlaceholder SpecialKey
hi def link VimwikiPlaceholderParam String
hi def link VimwikiHTMLtag SpecialKey

hi def link VimwikiEqInChar VimwikiMarkers
hi def link VimwikiCellSeparator VimwikiMarkers
hi def link VimwikiBoldChar VimwikiMarkers
hi def link VimwikiItalicChar VimwikiMarkers
hi def link VimwikiBoldItalicChar VimwikiMarkers
hi def link VimwikiItalicBoldChar VimwikiMarkers
hi def link VimwikiDelTextChar VimwikiMarkers
hi def link VimwikiSuperScriptChar VimwikiMarkers
hi def link VimwikiSubScriptChar VimwikiMarkers
hi def link VimwikiCodeChar VimwikiMarkers
hi def link VimwikiHeaderChar VimwikiMarkers

hi def link VimwikiEqInCharT VimwikiMarkers
hi def link VimwikiBoldCharT VimwikiMarkers
hi def link VimwikiItalicCharT VimwikiMarkers
hi def link VimwikiBoldItalicCharT VimwikiMarkers
hi def link VimwikiItalicBoldCharT VimwikiMarkers
hi def link VimwikiDelTextCharT VimwikiMarkers
hi def link VimwikiSuperScriptCharT VimwikiMarkers
hi def link VimwikiSubScriptCharT VimwikiMarkers
hi def link VimwikiCodeCharT VimwikiMarkers
hi def link VimwikiHeaderCharT VimwikiMarkers
hi def link VimwikiLinkCharT VimwikiLinkT
hi def link VimwikiNoExistsLinkCharT VimwikiNoExistsLinkT
"}}}

" -------------------------------------------------------------------------
" Load syntax-specific functionality
execute 'runtime! syntax/vimwiki_'.VimwikiGet('syntax').'_custom.vim'
" -------------------------------------------------------------------------

" FIXME it now does not make sense to pretend there is a single syntax "vimwiki"
let b:current_syntax="vimwiki"

" EMBEDDED syntax setup "{{{
let nested = VimwikiGet('nested_syntaxes')
if !empty(nested)
  for [hl_syntax, vim_syntax] in items(nested)
    call vimwiki#base#nested_syntax(vim_syntax,
          \ '^\s*'.g:vimwiki_rxPreStart.'\%(.*[[:blank:][:punct:]]\)\?'.
          \ hl_syntax.'\%([[:blank:][:punct:]].*\)\?',
          \ '^\s*'.g:vimwiki_rxPreEnd, 'VimwikiPre')
  endfor
endif
" LaTeX
call vimwiki#base#nested_syntax('tex',
      \ '^\s*'.g:vimwiki_rxMathStart.'\%(.*[[:blank:][:punct:]]\)\?'.
      \ '\%([[:blank:][:punct:]].*\)\?',
      \ '^\s*'.g:vimwiki_rxMathEnd, 'VimwikiMath')
"}}}


syntax spell toplevel

let timeend = vimwiki#u#time(starttime)  "XXX
call VimwikiLog_extend('timing',['syntax:scans',timescans],['syntax:regexloaded',time0],['syntax:beforeHLexisting',time01],['syntax:afterHLexisting',time02],['syntax:end',timeend])
syntax/vimwiki_markdown_custom.vim	[[[1
392
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki syntax file
" Author: Stuart Andrews <stu.andrews@gmail.com>
" Home: http://code.google.com/p/vimwiki/

" LINKS: assume this is common to all syntaxes "{{{

" }}}

" -------------------------------------------------------------------------
" Load concrete Wiki syntax: sets regexes and templates for headers and links

" -------------------------------------------------------------------------



" LINKS: setup of larger regexes {{{

" LINKS: setup wikilink0 regexps {{{
" 0. [[URL]], or [[URL|DESCRIPTION]]

" 0a) match [[URL|DESCRIPTION]]
let g:vimwiki_rxWikiLink0 = g:vimwiki_rxWikiLink
" 0b) match URL within [[URL|DESCRIPTION]]
let g:vimwiki_rxWikiLink0MatchUrl = g:vimwiki_rxWikiLinkMatchUrl
" 0c) match DESCRIPTION within [[URL|DESCRIPTION]]
let g:vimwiki_rxWikiLink0MatchDescr = g:vimwiki_rxWikiLinkMatchDescr
" }}}

" LINKS: setup wikilink1 regexps {{{
" 1. [URL][], or [DESCRIPTION][URL]

let g:vimwiki_rxWikiLink1Prefix = '['
let g:vimwiki_rxWikiLink1Suffix = ']'
let g:vimwiki_rxWikiLink1Separator = ']['

" [URL][]
let g:vimwiki_WikiLink1Template1 = g:vimwiki_rxWikiLink1Prefix . '__LinkUrl__'.
      \ g:vimwiki_rxWikiLink1Separator. g:vimwiki_rxWikiLink1Suffix
" [DESCRIPTION][URL]
let g:vimwiki_WikiLink1Template2 = g:vimwiki_rxWikiLink1Prefix . '__LinkDescription__'.
    \ g:vimwiki_rxWikiLink1Separator. '__LinkUrl__'.
    \ g:vimwiki_rxWikiLink1Suffix
"
let magic_chars = '.*[]\^$'
let valid_chars = '[^\\\[\]]'

let g:vimwiki_rxWikiLink1Prefix = escape(g:vimwiki_rxWikiLink1Prefix, magic_chars)
let g:vimwiki_rxWikiLink1Suffix = escape(g:vimwiki_rxWikiLink1Suffix, magic_chars)
let g:vimwiki_rxWikiLink1Separator = escape(g:vimwiki_rxWikiLink1Separator, magic_chars)
let g:vimwiki_rxWikiLink1Url = valid_chars.'\{-}'
let g:vimwiki_rxWikiLink1Descr = valid_chars.'\{-}'

let g:vimwiki_rxWikiLink1InvalidPrefix = '[\]\[]\@<!'
let g:vimwiki_rxWikiLink1InvalidSuffix = '[\]\[]\@!'
let g:vimwiki_rxWikiLink1Prefix = g:vimwiki_rxWikiLink1InvalidPrefix.
      \ g:vimwiki_rxWikiLink1Prefix
let g:vimwiki_rxWikiLink1Suffix = g:vimwiki_rxWikiLink1Suffix.
      \ g:vimwiki_rxWikiLink1InvalidSuffix

"
" 1. [URL][], [DESCRIPTION][URL]
" 1a) match [URL][], [DESCRIPTION][URL]
let g:vimwiki_rxWikiLink1 = g:vimwiki_rxWikiLink1Prefix.
    \ g:vimwiki_rxWikiLink1Url. g:vimwiki_rxWikiLink1Separator.
    \ g:vimwiki_rxWikiLink1Suffix.
    \ '\|'. g:vimwiki_rxWikiLink1Prefix.
    \ g:vimwiki_rxWikiLink1Descr.g:vimwiki_rxWikiLink1Separator.
    \ g:vimwiki_rxWikiLink1Url.g:vimwiki_rxWikiLink1Suffix
" 1b) match URL within [URL][], [DESCRIPTION][URL]
let g:vimwiki_rxWikiLink1MatchUrl = g:vimwiki_rxWikiLink1Prefix.
    \ '\zs'. g:vimwiki_rxWikiLink1Url. '\ze'. g:vimwiki_rxWikiLink1Separator.
    \ g:vimwiki_rxWikiLink1Suffix.
    \ '\|'. g:vimwiki_rxWikiLink1Prefix.
    \ g:vimwiki_rxWikiLink1Descr. g:vimwiki_rxWikiLink1Separator.
    \ '\zs'. g:vimwiki_rxWikiLink1Url. '\ze'. g:vimwiki_rxWikiLink1Suffix
" 1c) match DESCRIPTION within [DESCRIPTION][URL]
let g:vimwiki_rxWikiLink1MatchDescr = g:vimwiki_rxWikiLink1Prefix.
    \ '\zs'. g:vimwiki_rxWikiLink1Descr.'\ze'. g:vimwiki_rxWikiLink1Separator.
    \ g:vimwiki_rxWikiLink1Url.g:vimwiki_rxWikiLink1Suffix
" }}}

" LINKS: Syntax helper {{{
let g:vimwiki_rxWikiLink1Prefix1 = g:vimwiki_rxWikiLink1Prefix
let g:vimwiki_rxWikiLink1Suffix1 = g:vimwiki_rxWikiLink1Separator.
      \ g:vimwiki_rxWikiLink1Url.g:vimwiki_rxWikiLink1Suffix
" }}}

" *. ANY wikilink {{{
" *a) match ANY wikilink
let g:vimwiki_rxWikiLink = ''.
    \ g:vimwiki_rxWikiLink0.'\|'.
    \ g:vimwiki_rxWikiLink1
" *b) match URL within ANY wikilink
let g:vimwiki_rxWikiLinkMatchUrl = ''.
    \ g:vimwiki_rxWikiLink0MatchUrl.'\|'.
    \ g:vimwiki_rxWikiLink1MatchUrl
" *c) match DESCRIPTION within ANY wikilink
let g:vimwiki_rxWikiLinkMatchDescr = ''.
    \ g:vimwiki_rxWikiLink0MatchDescr.'\|'.
    \ g:vimwiki_rxWikiLink1MatchDescr
" }}}

" LINKS: setup of wikiincl regexps {{{
" }}}

" LINKS: Syntax helper {{{
" }}}

" LINKS: Setup weblink0 regexps {{{
" 0. URL : free-standing links: keep URL UR(L) strip trailing punct: URL; URL) UR(L))
let g:vimwiki_rxWeblink0 = g:vimwiki_rxWeblink
" 0a) match URL within URL
let g:vimwiki_rxWeblinkMatchUrl0 = g:vimwiki_rxWeblinkMatchUrl
" 0b) match DESCRIPTION within URL
let g:vimwiki_rxWeblinkMatchDescr0 = g:vimwiki_rxWeblinkMatchDescr
" }}}

" LINKS: Setup weblink1 regexps {{{
let g:vimwiki_rxWeblink1Prefix = '['
let g:vimwiki_rxWeblink1Suffix = ')'
let g:vimwiki_rxWeblink1Separator = ']('
" [DESCRIPTION](URL)
let g:vimwiki_Weblink1Template = g:vimwiki_rxWeblink1Prefix . '__LinkDescription__'.
      \ g:vimwiki_rxWeblink1Separator. '__LinkUrl__'.
      \ g:vimwiki_rxWeblink1Suffix

let magic_chars = '.*[]\^$'
let valid_chars = '[^\\]'

let g:vimwiki_rxWeblink1Prefix = escape(g:vimwiki_rxWeblink1Prefix, magic_chars)
let g:vimwiki_rxWeblink1Suffix = escape(g:vimwiki_rxWeblink1Suffix, magic_chars)
let g:vimwiki_rxWeblink1Separator = escape(g:vimwiki_rxWeblink1Separator, magic_chars)
let g:vimwiki_rxWeblink1Url = valid_chars.'\{-}'
let g:vimwiki_rxWeblink1Descr = valid_chars.'\{-}'

"
" " 2012-02-04 TODO not starting with [[ or ][ ?  ... prefix = '[\[\]]\@<!\['
" 1. [DESCRIPTION](URL)
" 1a) match [DESCRIPTION](URL)
let g:vimwiki_rxWeblink1 = g:vimwiki_rxWeblink1Prefix.
      \ g:vimwiki_rxWeblink1Url.g:vimwiki_rxWeblink1Separator.
      \ g:vimwiki_rxWeblink1Descr.g:vimwiki_rxWeblink1Suffix
" 1b) match URL within [DESCRIPTION](URL)
let g:vimwiki_rxWeblink1MatchUrl = g:vimwiki_rxWeblink1Prefix.
      \ g:vimwiki_rxWeblink1Descr. g:vimwiki_rxWeblink1Separator.
      \ '\zs'.g:vimwiki_rxWeblink1Url.'\ze'. g:vimwiki_rxWeblink1Suffix
" 1c) match DESCRIPTION within [DESCRIPTION](URL)
let g:vimwiki_rxWeblink1MatchDescr = g:vimwiki_rxWeblink1Prefix.
      \ '\zs'.g:vimwiki_rxWeblink1Descr.'\ze'. g:vimwiki_rxWeblink1Separator.
      \ g:vimwiki_rxWeblink1Url. g:vimwiki_rxWeblink1Suffix
" }}}

" Syntax helper {{{
" TODO: image links too !!
" let g:vimwiki_rxWeblink1Prefix1 = '!\?'. g:vimwiki_rxWeblink1Prefix
let g:vimwiki_rxWeblink1Prefix1 = g:vimwiki_rxWeblink1Prefix
let g:vimwiki_rxWeblink1Suffix1 = g:vimwiki_rxWeblink1Separator.
      \ g:vimwiki_rxWeblink1Url.g:vimwiki_rxWeblink1Suffix
" }}}

" *. ANY weblink {{{
" *a) match ANY weblink
let g:vimwiki_rxWeblink = ''.
    \ g:vimwiki_rxWeblink1.'\|'.
    \ g:vimwiki_rxWeblink0
" *b) match URL within ANY weblink
let g:vimwiki_rxWeblinkMatchUrl = ''.
    \ g:vimwiki_rxWeblink1MatchUrl.'\|'.
    \ g:vimwiki_rxWeblinkMatchUrl0
" *c) match DESCRIPTION within ANY weblink
let g:vimwiki_rxWeblinkMatchDescr = ''.
    \ g:vimwiki_rxWeblink1MatchDescr.'\|'.
    \ g:vimwiki_rxWeblinkMatchDescr0
" }}}


" LINKS: Setup anylink regexps {{{
let g:vimwiki_rxAnyLink = g:vimwiki_rxWikiLink.'\|'.
      \ g:vimwiki_rxWikiIncl.'\|'.g:vimwiki_rxWeblink
" }}}


" LINKS: setup wikilink1 reference link definitions {{{
let g:vimwiki_rxMkdRef = '\['.g:vimwiki_rxWikiLinkDescr.']:\%(\s\+\|\n\)'.
      \ g:vimwiki_rxWeblink0
let g:vimwiki_rxMkdRefMatchDescr = '\[\zs'.g:vimwiki_rxWikiLinkDescr.'\ze]:\%(\s\+\|\n\)'.
      \ g:vimwiki_rxWeblink0
let g:vimwiki_rxMkdRefMatchUrl = '\['.g:vimwiki_rxWikiLinkDescr.']:\%(\s\+\|\n\)\zs'.
      \ g:vimwiki_rxWeblink0.'\ze'
" }}}

" }}} end of Links

" LINKS: highlighting is complicated due to "nonexistent" links feature {{{
function! s:add_target_syntax_ON(target, type) " {{{
  if g:vimwiki_debug > 1
    echom '[vimwiki_debug] syntax target > '.a:target
  endif
  let prefix0 = 'syntax match '.a:type.' `'
  let suffix0 = '` display contains=@NoSpell,VimwikiLinkRest,'.a:type.'Char'
  let prefix1 = 'syntax match '.a:type.'T `'
  let suffix1 = '` display contained'
  execute prefix0. a:target. suffix0
  execute prefix1. a:target. suffix1
endfunction "}}}

function! s:add_target_syntax_OFF(target, type) " {{{
  if g:vimwiki_debug > 1
    echom '[vimwiki_debug] syntax target > '.a:target
  endif
  let prefix0 = 'syntax match VimwikiNoExistsLink `'
  let suffix0 = '` display contains=@NoSpell,VimwikiLinkRest,'.a:type.'Char'
  let prefix1 = 'syntax match VimwikiNoExistsLinkT `'
  let suffix1 = '` display contained'
  execute prefix0. a:target. suffix0
  execute prefix1. a:target. suffix1
endfunction "}}}

function! s:wrap_wikilink1_rx(target) "{{{
  return g:vimwiki_rxWikiLink1InvalidPrefix.a:target.
        \ g:vimwiki_rxWikiLink1InvalidSuffix
endfunction "}}}

function! s:existing_mkd_refs() "{{{
  call vimwiki#markdown_base#reset_mkd_refs()
  return "\n".join(keys(vimwiki#markdown_base#get_reflinks()), "\n")."\n"
endfunction "}}}

function! s:highlight_existing_links() "{{{
  " Wikilink1
  " Conditional highlighting that depends on the existence of a wiki file or
  "   directory is only available for *schemeless* wiki links
  " Links are set up upon BufEnter (see plugin/...)
  let safe_links = vimwiki#base#file_pattern(b:existing_wikifiles)
  " Wikilink1 Dirs set up upon BufEnter (see plugin/...)
  let safe_dirs = vimwiki#base#file_pattern(b:existing_wikidirs)
  " Ref links are cached
  let safe_reflinks = vimwiki#base#file_pattern(s:existing_mkd_refs())


  " match [URL][]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLink1Template1,
        \ safe_links, g:vimwiki_rxWikiLink1Descr, '')
  call s:add_target_syntax_ON(s:wrap_wikilink1_rx(target), 'VimwikiWikiLink1')
  " match [DESCRIPTION][URL]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLink1Template2,
        \ safe_links, g:vimwiki_rxWikiLink1Descr, '')
  call s:add_target_syntax_ON(s:wrap_wikilink1_rx(target), 'VimwikiWikiLink1')

  " match [DIRURL][]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLink1Template1,
        \ safe_dirs, g:vimwiki_rxWikiLink1Descr, '')
  call s:add_target_syntax_ON(s:wrap_wikilink1_rx(target), 'VimwikiWikiLink1')
  " match [DESCRIPTION][DIRURL]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLink1Template2,
        \ safe_dirs, g:vimwiki_rxWikiLink1Descr, '')
  call s:add_target_syntax_ON(s:wrap_wikilink1_rx(target), 'VimwikiWikiLink1')

  " match [MKDREF][]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLink1Template1,
        \ safe_reflinks, g:vimwiki_rxWikiLink1Descr, '')
  call s:add_target_syntax_ON(s:wrap_wikilink1_rx(target), 'VimwikiWikiLink1')
  " match [DESCRIPTION][MKDREF]
  let target = vimwiki#base#apply_template(g:vimwiki_WikiLink1Template2,
        \ safe_reflinks, g:vimwiki_rxWikiLink1Descr, '')
  call s:add_target_syntax_ON(s:wrap_wikilink1_rx(target), 'VimwikiWikiLink1')
endfunction "}}}


" use max highlighting - could be quite slow if there are too many wikifiles
if VimwikiGet('maxhi')
  " WikiLink
  call s:add_target_syntax_OFF(g:vimwiki_rxWikiLink1, 'VimwikiWikiLink1')

  " Subsequently, links verified on vimwiki's path are highlighted as existing
  let time01 = vimwiki#u#time(starttime)  "XXX
  call s:highlight_existing_links()
  let time02 = vimwiki#u#time(starttime)  "XXX
else
  let time01 = vimwiki#u#time(starttime)  "XXX
  " Wikilink
  call s:add_target_syntax_ON(g:vimwiki_rxWikiLink1, 'VimwikiWikiLink1')
  let time02 = vimwiki#u#time(starttime)  "XXX
endif

" Weblink
call s:add_target_syntax_ON(g:vimwiki_rxWeblink1, 'VimwikiWeblink1')

" WikiLink
" All remaining schemes are highlighted automatically
let rxSchemes = '\%('.
      \ join(split(g:vimwiki_schemes, '\s*,\s*'), '\|').'\|'.
      \ join(split(g:vimwiki_web_schemes1, '\s*,\s*'), '\|').
      \ '\):'

" a) match [nonwiki-scheme-URL]
let target = vimwiki#base#apply_template(g:vimwiki_WikiLink1Template1,
      \ rxSchemes.g:vimwiki_rxWikiLink1Url, g:vimwiki_rxWikiLink1Descr, '')
call s:add_target_syntax_ON(s:wrap_wikilink1_rx(target), 'VimwikiWikiLink1')
" b) match [DESCRIPTION][nonwiki-scheme-URL]
let target = vimwiki#base#apply_template(g:vimwiki_WikiLink1Template2,
      \ rxSchemes.g:vimwiki_rxWikiLink1Url, g:vimwiki_rxWikiLink1Descr, '')
call s:add_target_syntax_ON(s:wrap_wikilink1_rx(target), 'VimwikiWikiLink1')
" }}}


" generic headers "{{{

" Header levels, 1-6
for i in range(1,6)
  execute 'syntax match VimwikiHeader'.i.' /'.g:vimwiki_rxH{i}.'/ contains=VimwikiTodo,VimwikiHeaderChar,VimwikiNoExistsLink,VimwikiCode,VimwikiLink,VimwikiWeblink1,VimwikiWikiLink1,@Spell'
endfor

" }}}

" concealed chars " {{{
if exists("+conceallevel")
  syntax conceal on
endif

syntax spell toplevel

if g:vimwiki_debug > 1
  echom 'WikiLink1 Prefix: '.g:vimwiki_rxWikiLink1Prefix1
  echom 'WikiLink1 Suffix: '.g:vimwiki_rxWikiLink1Suffix1
  echom 'Weblink1 Prefix: '.g:vimwiki_rxWeblink1Prefix1
  echom 'Weblink1 Suffix: '.g:vimwiki_rxWeblink1Suffix1
endif

" VimwikiWikiLink1Char is for syntax markers (and also URL when a description
" is present) and may be concealed
let options = ' contained transparent contains=NONE'
" conceal wikilink1
execute 'syn match VimwikiWikiLink1Char /'.g:vimwiki_rxWikiLink1Prefix.'/'.options
execute 'syn match VimwikiWikiLink1Char /'.g:vimwiki_rxWikiLink1Suffix.'/'.options
execute 'syn match VimwikiWikiLink1Char /'.g:vimwiki_rxWikiLink1Prefix1.'/'.options
execute 'syn match VimwikiWikiLink1Char /'.g:vimwiki_rxWikiLink1Suffix1.'/'.options

" conceal weblink1
execute 'syn match VimwikiWeblink1Char "'.g:vimwiki_rxWeblink1Prefix1.'"'.options
execute 'syn match VimwikiWeblink1Char "'.g:vimwiki_rxWeblink1Suffix1.'"'.options

if exists("+conceallevel")
  syntax conceal off
endif
" }}}

" non concealed chars " {{{
" }}}

" main syntax groups {{{

" Tables
syntax match VimwikiTableRow /^\s*|.\+|\s*$/
      \ transparent contains=VimwikiCellSeparator,
                           \ VimwikiLinkT,
                           \ VimwikiWeblink1T,
                           \ VimwikiWikiLink1T,
                           \ VimwikiNoExistsLinkT,
                           \ VimwikiEmoticons,
                           \ VimwikiTodo,
                           \ VimwikiBoldT,
                           \ VimwikiItalicT,
                           \ VimwikiBoldItalicT,
                           \ VimwikiItalicBoldT,
                           \ VimwikiDelTextT,
                           \ VimwikiSuperScriptT,
                           \ VimwikiSubScriptT,
                           \ VimwikiCodeT,
                           \ VimwikiEqInT,
                           \ @Spell

" }}}

" header groups highlighting "{{{
"}}}


" syntax group highlighting "{{{
hi def link VimwikiWeblink1 VimwikiLink
hi def link VimwikiWeblink1T VimwikiLink

hi def link VimwikiWikiLink1 VimwikiLink
hi def link VimwikiWikiLink1T VimwikiLink
"}}}



" EMBEDDED syntax setup "{{{
"}}}
"
autoload/vimwiki/style.css	[[[1
79
body {font-family: Tahoma, Geneva, sans-serif; margin: 1em 2em 1em 2em; font-size: 100%; line-height: 130%;}
h1, h2, h3, h4, h5, h6 {font-family: Trebuchet MS, Helvetica, sans-serif; font-weight: bold; line-height:100%; margin-top: 1.5em; margin-bottom: 0.5em;}
h1 {font-size: 2.6em; color: #000000;}
h2 {font-size: 2.2em; color: #404040;}
h3 {font-size: 1.8em; color: #707070;}
h4 {font-size: 1.4em; color: #909090;}
h5 {font-size: 1.3em; color: #989898;}
h6 {font-size: 1.2em; color: #9c9c9c;}
p, pre, blockquote, table, ul, ol, dl {margin-top: 1em; margin-bottom: 1em;}
ul ul, ul ol, ol ol, ol ul {margin-top: 0.5em; margin-bottom: 0.5em;}
li {margin: 0.3em auto;}
ul {margin-left: 2em; padding-left: 0.5em;}
dt {font-weight: bold;}
img {border: none;}
pre {border-left: 1px solid #ccc; margin-left: 2em; padding-left: 0.5em;}
blockquote {padding: 0.4em; background-color: #f6f5eb;}
th, td {border: 1px solid #ccc; padding: 0.3em;}
th {background-color: #f0f0f0;}
hr {border: none; border-top: 1px solid #ccc; width: 100%;}
del {text-decoration: line-through; color: #777777;}
.toc li {list-style-type: none;}
.todo {font-weight: bold; background-color: #f0ece8; color: #a03020;}
.justleft {text-align: left;}
.justright {text-align: right;}
.justcenter {text-align: center;}
.center {margin-left: auto; margin-right: auto;}

/* classes for items of todo lists */
.done0 {
    /* list-style: none; */
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAxQAAAMUBHc26qAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAA7SURBVCiR7dMxEgAgCANBI3yVRzF5KxNbW6wsuH7LQ2YKQK1mkswBVERYF5Os3UV3gwd/jF2SkXy66gAZkxS6BniubAAAAABJRU5ErkJggg==);
    background-repeat: no-repeat;
    background-position: 0 .2em;
    margin-left: -2em;
    padding-left: 1.5em;
}
.done1 {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAxQAAAMUBHc26qAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABtSURBVCiR1ZO7DYAwDER9BDmTeZQMFXmUbGYpOjrEryA0wOvO8itOslFrJYAug5BMM4BeSkmjsrv3aVTa8p48Xw1JSkSsWVUFwD05IqS1tmYzk5zzae9jnVVVzGyXb8sALjse+euRkEzu/uirFomVIdDGOLjuAAAAAElFTkSuQmCC);
    background-repeat: no-repeat;
    background-position: 0 .15em;
    margin-left: -2em;
    padding-left: 1.5em;
}
.done2 {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAxQAAAMUBHc26qAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAB1SURBVCiRzdO5DcAgDAVQGxjAYgTvxlDIu1FTIRYAp8qlFISkSH7l5kk+ZIwxKiI2mIyqWoeILYRgZ7GINDOLjnmF3VqklKCUMgTee2DmM661Qs55iI3Zm/1u5h9sm4ig9z4ERHTFzLyd4G4+nFlVrYg8+qoF/c0kdpeMsmcAAAAASUVORK5CYII=);
    background-repeat: no-repeat;
    background-position: 0 .15em;
    margin-left: -2em;
    padding-left: 1.5em;
}
.done3 {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA8AAAAPCAYAAAA71pVKAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAxQAAAMUBHc26qAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAABoSURBVCiR7dOxDcAgDATA/0DtUdiKoZC3YhLkHjkVKF3idJHiztKfvrHZWnOSE8Fx95RJzlprimJVnXktvXeY2S0SEZRSAAAbmxnGGKH2I5T+8VfxPhIReQSuuY3XyYWa3T2p6quvOgGrvSFGlewuUAAAAABJRU5ErkJggg==);
    background-repeat: no-repeat;
    background-position: 0 .15em;
    margin-left: -2em;
    padding-left: 1.5em;
}
.done4 {
    background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAAQCAYAAAAbBi9cAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAAzgAAAM4BlP6ToAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAIISURBVDiNnZQ9SFtRFMd/773kpTaGJoQk1im4VDpWQcTNODhkFBcVTCNCF0NWyeDiIIiCm82QoIMIUkHUxcFBg1SEQoZszSat6cdTn1qNue92CMbEr9Sey+XC/Z/zu+f8h6ukUil3sVg0+M+4cFxk42/jH2wAqqqKSCSiPQdwcHHAnDHH9s/tN1h8V28ETdP+eU8fT9Nt62ancYdIPvJNtsu87bmjrJlrTDVM4RROJs1JrHPrD4Bar7A6cpc54iKOaTdJXCUI2UMVrQZ0Js7YPN18ECKkYNQcJe/OE/4dZsw7VqNXQMvHy3QZXQypQ6ycrtwDjf8aJ+PNEDSCzLpn7+m2pD8ZKHlKarYhy6XjEoCYGcN95qansQeA3fNdki+SaJZGTMQIOoL3W/Z89rxv+tokubNajlvk/vm+LFpF2XnUKZHI0I+QrI7Dw0OZTqdzUkpsM7mZTyfy5OPGyw1tK7AFSvmB/Ks8w8YwbUYbe6/3QEKv0vugfxWPnMLJun+d/kI/WLdizpNjMbAIKrhMF4OuwadBALqqs+RfInwUvuNi+fBd+wjogfogAFVRmffO02q01mZZ0HHdgXIzdz0QQLPezIQygX6llxNKKgOFARYCC49CqhoHIUTlss/Vx2phlYwjw8j1CAlfAiwQiJpiy7o1VHnsG5FISkoJu7Q/2YmmaV+i0ei7v38L2CBguSi5AAAAAElFTkSuQmCC);
    background-repeat: no-repeat;
    background-position: 0 .15em;
    margin-left: -2em;
    padding-left: 1.5em;
}

code {
    font-family: Monaco,"Courier New","DejaVu Sans Mono","Bitstream Vera Sans Mono",monospace;
    -webkit-border-radius: 1px;
    -moz-border-radius: 1px;
    border-radius: 1px;
    -moz-background-clip: padding;
    -webkit-background-clip: padding-box;
    background-clip: padding-box;
    padding: 0px 3px;
    display: inline-block;
    color: #52595d;
    border: 1px solid #ccc;
    background-color: #f9f9f9;
}
autoload/vimwiki/tbl.vim	[[[1
665
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki autoload plugin file
" Desc: Tables
" | Easily | manageable | text  | tables | !       |
" |--------|------------|-------|--------|---------|
" | Have   | fun!       | Drink | tea    | Period. |
"
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

" Load only once {{{
if exists("g:loaded_vimwiki_tbl_auto") || &cp
  finish
endif
let g:loaded_vimwiki_tbl_auto = 1
"}}}

let s:textwidth = &tw


" Misc functions {{{
function! s:rxSep() "{{{
  return g:vimwiki_rxTableSep
endfunction "}}}

function! s:wide_len(str) "{{{
  " vim73 has new function that gives correct string width.
  if exists("*strdisplaywidth")
    return strdisplaywidth(a:str)
  endif

  " get str display width in vim ver < 7.2
  if !g:vimwiki_CJK_length
    let ret = strlen(substitute(a:str, '.', 'x', 'g'))
  else
    let savemodified = &modified
    let save_cursor = getpos('.')
    exe "norm! o\<esc>"
    call setline(line("."), a:str)
    let ret = virtcol("$") - 1
    d
    call setpos('.', save_cursor)
    let &modified = savemodified
  endif
  return ret
endfunction "}}}

function! s:cell_splitter() "{{{
  return '\s*'.s:rxSep().'\s*'
endfunction "}}}

function! s:sep_splitter() "{{{
  return '-'.s:rxSep().'-'
endfunction "}}}

function! s:is_table(line) "{{{
  return s:is_separator(a:line) || (a:line !~ s:rxSep().s:rxSep() && a:line =~ '^\s*'.s:rxSep().'.\+'.s:rxSep().'\s*$')
endfunction "}}}

function! s:is_separator(line) "{{{
  return a:line =~ '^\s*'.s:rxSep().'\(--\+'.s:rxSep().'\)\+\s*$'
endfunction "}}}

function! s:is_separator_tail(line) "{{{
  return a:line =~ '^\{-1}\%(\s*\|-*\)\%('.s:rxSep().'-\+\)\+'.s:rxSep().'\s*$'
endfunction "}}}

function! s:is_last_column(lnum, cnum) "{{{
  let line = strpart(getline(a:lnum), a:cnum - 1)
  "echomsg "DEBUG is_last_column> ".(line =~ s:rxSep().'\s*$' && line !~ s:rxSep().'.*'.s:rxSep().'\s*$')
  return line =~ s:rxSep().'\s*$'  && line !~ s:rxSep().'.*'.s:rxSep().'\s*$'

endfunction "}}}

function! s:is_first_column(lnum, cnum) "{{{
  let line = strpart(getline(a:lnum), 0, a:cnum - 1)
  "echomsg "DEBUG is_first_column> ".(line =~ '^\s*'.s:rxSep() && line !~ '^\s*'.s:rxSep().'.*'.s:rxSep())
  return line =~ '^\s*$' || (line =~ '^\s*'.s:rxSep() && line !~ '^\s*'.s:rxSep().'.*'.s:rxSep())
endfunction "}}}

function! s:count_separators_up(lnum) "{{{
  let lnum = a:lnum - 1
  while lnum > 1
    if !s:is_separator(getline(lnum))
      break
    endif
    let lnum -= 1
  endwhile

  return (a:lnum-lnum)
endfunction "}}}

function! s:count_separators_down(lnum) "{{{
  let lnum = a:lnum + 1
  while lnum < line('$')
    if !s:is_separator(getline(lnum))
      break
    endif
    let lnum += 1
  endwhile

  return (lnum-a:lnum)
endfunction "}}}

function! s:create_empty_row(cols) "{{{
  let row = s:rxSep()
  let cell = "   ".s:rxSep()

  for c in range(a:cols)
    let row .= cell
  endfor

  return row
endfunction "}}}

function! s:create_row_sep(cols) "{{{
  let row = s:rxSep()
  let cell = "---".s:rxSep()

  for c in range(a:cols)
    let row .= cell
  endfor

  return row
endfunction "}}}

function! vimwiki#tbl#get_cells(line) "{{{
  let result = []
  let cell = ''
  let quote = ''
  let state = 'NONE'

  " 'Simple' FSM
  for idx in range(strlen(a:line))
    " The only way I know Vim can do Unicode...
    let ch = a:line[idx]
    if state == 'NONE'
      if ch == '|'
        let state = 'CELL'
      endif
    elseif state == 'CELL'
      if ch == '[' || ch == '{'
        let state = 'BEFORE_QUOTE_START'
        let quote = ch
      elseif ch == '|'
        call add(result, vimwiki#u#trim(cell))
        let cell = ""
      else
        let cell .= ch
      endif
    elseif state == 'BEFORE_QUOTE_START'
      if ch == '[' || ch == '{'
        let state = 'QUOTE'
        let quote .= ch
      else
        let state = 'CELL'
        let cell .= quote.ch
        let quote = ''
      endif
    elseif state == 'QUOTE'
      if ch == ']' || ch == '}'
        let state = 'BEFORE_QUOTE_END'
      endif
      let quote .= ch
    elseif state == 'BEFORE_QUOTE_END'
      if ch == ']' || ch == '}'
        let state = 'CELL'
      endif
      let cell .= quote.ch
      let quote = ''
    endif
  endfor

  if cell.quote != ''
    call add(result, vimwiki#u#trim(cell.quote, '|'))
  endif
  return result
endfunction "}}}

function! s:col_count(lnum) "{{{
  return len(vimwiki#tbl#get_cells(getline(a:lnum)))
endfunction "}}}

function! s:get_indent(lnum) "{{{
  if !s:is_table(getline(a:lnum))
    return
  endif

  let indent = 0

  let lnum = a:lnum - 1
  while lnum > 1
    let line = getline(lnum)
    if !s:is_table(line)
      let indent = indent(lnum+1)
      break
    endif
    let lnum -= 1
  endwhile

  return indent
endfunction " }}}

function! s:get_rows(lnum) "{{{
  if !s:is_table(getline(a:lnum))
    return
  endif

  let upper_rows = []
  let lower_rows = []

  let lnum = a:lnum - 1
  while lnum >= 1
    let line = getline(lnum)
    if s:is_table(line)
      call add(upper_rows, [lnum, line])
    else
      break
    endif
    let lnum -= 1
  endwhile
  call reverse(upper_rows)

  let lnum = a:lnum
  while lnum <= line('$')
    let line = getline(lnum)
    if s:is_table(line)
      call add(lower_rows, [lnum, line])
    else
      break
    endif
    let lnum += 1
  endwhile

  return upper_rows + lower_rows
endfunction "}}}

function! s:get_cell_max_lens(lnum) "{{{
  let max_lens = {}
  for [lnum, row] in s:get_rows(a:lnum)
    if s:is_separator(row)
      continue
    endif
    let cells = vimwiki#tbl#get_cells(row)
    for idx in range(len(cells))
      let value = cells[idx]
      if has_key(max_lens, idx)
        let max_lens[idx] = max([s:wide_len(value), max_lens[idx]])
      else
        let max_lens[idx] = s:wide_len(value)
      endif
    endfor
  endfor
  return max_lens
endfunction "}}}

function! s:get_aligned_rows(lnum, col1, col2) "{{{
  let max_lens = s:get_cell_max_lens(a:lnum)
  let rows = []
  for [lnum, row] in s:get_rows(a:lnum)
    if s:is_separator(row)
      let new_row = s:fmt_sep(max_lens, a:col1, a:col2)
    else
      let new_row = s:fmt_row(row, max_lens, a:col1, a:col2)
    endif
    call add(rows, [lnum, new_row])
  endfor
  return rows
endfunction "}}}

" Number of the current column. Starts from 0.
function! s:cur_column() "{{{
  let line = getline('.')
  if !s:is_table(line)
    return -1
  endif
  " TODO: do we need conditional: if s:is_separator(line)

  let curs_pos = col('.')
  let mpos = match(line, s:rxSep(), 0)
  let col = -1
  while mpos < curs_pos && mpos != -1
    let mpos = match(line, s:rxSep(), mpos+1)
    if mpos != -1
      let col += 1
    endif
  endwhile
  return col
endfunction "}}}

" }}}

" Format functions {{{
function! s:fmt_cell(cell, max_len) "{{{
  let cell = ' '.a:cell.' '

  let diff = a:max_len - s:wide_len(a:cell)
  if diff == 0 && empty(a:cell)
    let diff = 1
  endif

  let cell .= repeat(' ', diff)
  return cell
endfunction "}}}

function! s:fmt_row(line, max_lens, col1, col2) "{{{
  let new_line = s:rxSep()
  let cells = vimwiki#tbl#get_cells(a:line)
  for idx in range(len(cells))
    if idx == a:col1
      let idx = a:col2
    elseif idx == a:col2
      let idx = a:col1
    endif
    let value = cells[idx]
    let new_line .= s:fmt_cell(value, a:max_lens[idx]).s:rxSep()
  endfor

  let idx = len(cells)
  while idx < len(a:max_lens)
    let new_line .= s:fmt_cell('', a:max_lens[idx]).s:rxSep()
    let idx += 1
  endwhile
  return new_line
endfunction "}}}

function! s:fmt_cell_sep(max_len) "{{{
  if a:max_len == 0
    return repeat('-', 3)
  else
    return repeat('-', a:max_len+2)
  endif
endfunction "}}}

function! s:fmt_sep(max_lens, col1, col2) "{{{
  let new_line = s:rxSep()
  for idx in range(len(a:max_lens))
    if idx == a:col1
      let idx = a:col2
    elseif idx == a:col2
      let idx = a:col1
    endif
    let new_line .= s:fmt_cell_sep(a:max_lens[idx]).s:rxSep()
  endfor
  return new_line
endfunction "}}}
"}}}

" Keyboard functions "{{{
function! s:kbd_create_new_row(cols, goto_first) "{{{
  let cmd = "\<ESC>o".s:create_empty_row(a:cols)
  let cmd .= "\<ESC>:call vimwiki#tbl#format(line('.'))\<CR>"
  let cmd .= "\<ESC>0"
  if a:goto_first
    let cmd .= ":call search('\\(".s:rxSep()."\\)\\zs', 'c', line('.'))\<CR>"
  else
    let cmd .= (col('.')-1)."l"
    let cmd .= ":call search('\\(".s:rxSep()."\\)\\zs', 'bc', line('.'))\<CR>"
  endif
  let cmd .= "a"

  return cmd
endfunction "}}}

function! s:kbd_goto_next_row() "{{{
  let cmd = "\<ESC>j"
  let cmd .= ":call search('.\\(".s:rxSep()."\\)', 'c', line('.'))\<CR>"
  let cmd .= ":call search('\\(".s:rxSep()."\\)\\zs', 'bc', line('.'))\<CR>"
  let cmd .= "a"
  return cmd
endfunction "}}}

function! s:kbd_goto_prev_row() "{{{
  let cmd = "\<ESC>k"
  let cmd .= ":call search('.\\(".s:rxSep()."\\)', 'c', line('.'))\<CR>"
  let cmd .= ":call search('\\(".s:rxSep()."\\)\\zs', 'bc', line('.'))\<CR>"
  let cmd .= "a"
  return cmd
endfunction "}}}

" Used in s:kbd_goto_next_col
function! vimwiki#tbl#goto_next_col() "{{{
  let curcol = virtcol('.')
  let lnum = line('.')
  let newcol = s:get_indent(lnum)
  let max_lens = s:get_cell_max_lens(lnum)
  for cell_len in values(max_lens)
    if newcol >= curcol-1
      break
    endif
    let newcol += cell_len + 3 " +3 == 2 spaces + 1 separator |<space>...<space>
  endfor
  let newcol += 2 " +2 == 1 separator + 1 space |<space
  call vimwiki#u#cursor(lnum, newcol)
endfunction "}}}

function! s:kbd_goto_next_col(jumpdown) "{{{
  let cmd = "\<ESC>"
  if a:jumpdown
    let seps = s:count_separators_down(line('.'))
    let cmd .= seps."j0"
  endif
  let cmd .= ":call vimwiki#tbl#goto_next_col()\<CR>a"
  return cmd
endfunction "}}}

" Used in s:kbd_goto_prev_col
function! vimwiki#tbl#goto_prev_col() "{{{
  let curcol = virtcol('.')
  let lnum = line('.')
  let newcol = s:get_indent(lnum)
  let max_lens = s:get_cell_max_lens(lnum)
  let prev_cell_len = 0
  echom string(max_lens)
  for cell_len in values(max_lens)
    let delta = cell_len + 3 " +3 == 2 spaces + 1 separator |<space>...<space>
    if newcol + delta > curcol-1
      let newcol -= (prev_cell_len + 3) " +3 == 2 spaces + 1 separator |<space>...<space>
      break
    elseif newcol + delta == curcol-1
      break
    endif
    let prev_cell_len = cell_len
    let newcol += delta
  endfor
  let newcol += 2 " +2 == 1 separator + 1 space |<space
  call vimwiki#u#cursor(lnum, newcol)
endfunction "}}}

function! s:kbd_goto_prev_col(jumpup) "{{{
  let cmd = "\<ESC>"
  if a:jumpup
    let seps = s:count_separators_up(line('.'))
    let cmd .= seps."k"
    let cmd .= "$"
  endif
  let cmd .= ":call vimwiki#tbl#goto_prev_col()\<CR>a"
  " let cmd .= ":call search('\\(".s:rxSep()."\\)\\zs', 'b', line('.'))\<CR>"
  " let cmd .= "a"
  "echomsg "DEBUG kbd_goto_prev_col> ".cmd
  return cmd
endfunction "}}}

"}}}

" Global functions {{{
function! vimwiki#tbl#kbd_cr() "{{{
  let lnum = line('.')
  if !s:is_table(getline(lnum))
    return "\<CR>"
  endif

  if s:is_separator(getline(lnum+1)) || !s:is_table(getline(lnum+1))
    let cols = len(vimwiki#tbl#get_cells(getline(lnum)))
    return s:kbd_create_new_row(cols, 0)
  else
    return s:kbd_goto_next_row()
  endif
endfunction "}}}

function! vimwiki#tbl#kbd_tab() "{{{
  let lnum = line('.')
  if !s:is_table(getline(lnum))
    return "\<Tab>"
  endif

  let last = s:is_last_column(lnum, col('.'))
  let is_sep = s:is_separator_tail(getline(lnum))
  "echomsg "DEBUG kbd_tab> last=".last.", is_sep=".is_sep
  if (is_sep || last) && !s:is_table(getline(lnum+1))
    let cols = len(vimwiki#tbl#get_cells(getline(lnum)))
    return s:kbd_create_new_row(cols, 1)
  endif
  return s:kbd_goto_next_col(is_sep || last)
endfunction "}}}

function! vimwiki#tbl#kbd_shift_tab() "{{{
  let lnum = line('.')
  if !s:is_table(getline(lnum))
    return "\<S-Tab>"
  endif

  let first = s:is_first_column(lnum, col('.'))
  let is_sep = s:is_separator_tail(getline(lnum))
  "echomsg "DEBUG kbd_tab> ".first
  if (is_sep || first) && !s:is_table(getline(lnum-1))
    return ""
  endif
  return s:kbd_goto_prev_col(is_sep || first)
endfunction "}}}

function! vimwiki#tbl#format(lnum, ...) "{{{
  if !(&filetype == 'vimwiki')
    return
  endif
  let line = getline(a:lnum)
  if !s:is_table(line)
    return
  endif

  if a:0 == 2
    let col1 = a:1
    let col2 = a:2
  else
    let col1 = 0
    let col2 = 0
  endif

  let indent = s:get_indent(a:lnum)

  for [lnum, row] in s:get_aligned_rows(a:lnum, col1, col2)
    let row = repeat(' ', indent).row
    call setline(lnum, row)
  endfor

  let &tw = s:textwidth
endfunction "}}}

function! vimwiki#tbl#create(...) "{{{
  if a:0 > 1
    let cols = a:1
    let rows = a:2
  elseif a:0 == 1
    let cols = a:1
    let rows = 2
  elseif a:0 == 0
    let cols = 5
    let rows = 2
  endif

  if cols < 1
    let cols = 5
  endif

  if rows < 1
    let rows = 2
  endif

  let lines = []
  let row = s:create_empty_row(cols)

  call add(lines, row)
  if rows > 1
    call add(lines, s:create_row_sep(cols))
  endif

  for r in range(rows - 1)
    call add(lines, row)
  endfor

  call append(line('.'), lines)
endfunction "}}}

function! vimwiki#tbl#align_or_cmd(cmd) "{{{
  if s:is_table(getline('.'))
    call vimwiki#tbl#format(line('.'))
  else
    exe 'normal! '.a:cmd
  endif
endfunction "}}}

function! vimwiki#tbl#reset_tw(lnum) "{{{
  if !(&filetype == 'vimwiki')
    return
  endif
  let line = getline(a:lnum)
  if !s:is_table(line)
    return
  endif

  let s:textwidth = &tw
  let &tw = 0
endfunction "}}}

" TODO: move_column_left and move_column_right are good candidates to be
" refactored.
function! vimwiki#tbl#move_column_left() "{{{

  "echomsg "DEBUG move_column_left: "

  let line = getline('.')

  if !s:is_table(line)
    return
  endif

  let cur_col = s:cur_column()
  if cur_col == -1
    return
  endif

  if cur_col > 0
    call vimwiki#tbl#format(line('.'), cur_col-1, cur_col)
    call cursor(line('.'), 1)

    let sep = '\('.s:rxSep().'\).\zs'
    let mpos = -1
    let col = -1
    while col < cur_col-1
      let mpos = match(line, sep, mpos+1)
      if mpos != -1
        let col += 1
      else
        break
      endif
    endwhile

  endif

endfunction "}}}

function! vimwiki#tbl#move_column_right() "{{{

  let line = getline('.')

  if !s:is_table(line)
    return
  endif

  let cur_col = s:cur_column()
  if cur_col == -1
    return
  endif

  if cur_col < s:col_count(line('.'))-1
    call vimwiki#tbl#format(line('.'), cur_col, cur_col+1)
    call cursor(line('.'), 1)

    let sep = '\('.s:rxSep().'\).\zs'
    let mpos = -1
    let col = -1
    while col < cur_col+1
      let mpos = match(line, sep, mpos+1)
      if mpos != -1
        let col += 1
      else
        break
      endif
    endwhile

  endif

endfunction "}}}

function! vimwiki#tbl#get_rows(lnum) "{{{
  return s:get_rows(a:lnum)
endfunction "}}}

function! vimwiki#tbl#is_table(line) "{{{
  return s:is_table(a:line)
endfunction "}}}

function! vimwiki#tbl#is_separator(line) "{{{
  return s:is_separator(a:line)
endfunction "}}}

function! vimwiki#tbl#cell_splitter() "{{{
  return s:cell_splitter()
endfunction "}}}

function! vimwiki#tbl#sep_splitter() "{{{
  return s:sep_splitter()
endfunction "}}}

"}}}
autoload/vimwiki/default.tpl	[[[1
11
<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<html>
<head>
<link rel="Stylesheet" type="text/css" href="%root_path%%css%">
<title>%title%</title>
<meta http-equiv="Content-Type" content="text/html; charset=%encoding%">
</head>
<body>
%content%
</body>
</html>
autoload/vimwiki/html.vim	[[[1
1603
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki autoload plugin file
" Export to HTML
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

" TODO: We need vimwiki abstract syntax tree. If properly designed it wourld
" greatly symplify different syntax to HTML generation.
"
" vimwiki   --            --> PDF
"             \          /
" markdown  -----> AST -----> HTML
"             /          \
" mediawiki --            --> Latex
"

" Load only once {{{
if exists("g:loaded_vimwiki_html_auto") || &cp
  finish
endif
let g:loaded_vimwiki_html_auto = 1
"}}}

" UTILITY "{{{
function s:get_completion_index(sym) "{{{
  for idx in range(1, 5)
    if match(g:vimwiki_listsyms, '\C\%'.idx.'v'.a:sym) != -1
      return (idx-1)
    endif
  endfor
  return 0
endfunction "}}}

function! s:root_path(subdir) "{{{
  return repeat('../', len(split(a:subdir, '[/\\]')))
endfunction "}}}

function! s:syntax_supported() " {{{
  return VimwikiGet('syntax') == "default"
endfunction " }}}

function! s:remove_blank_lines(lines) " {{{
  while !empty(a:lines) && a:lines[-1] =~ '^\s*$'
    call remove(a:lines, -1)
  endwhile
endfunction "}}}

function! s:is_web_link(lnk) "{{{
  if a:lnk =~ '^\%(https://\|http://\|www.\|ftp://\|file://\|mailto:\)'
    return 1
  endif
  return 0
endfunction "}}}

function! s:is_img_link(lnk) "{{{
  if tolower(a:lnk) =~ '\.\%(png\|jpg\|gif\|jpeg\)$'
    return 1
  endif
  return 0
endfunction "}}}

function! s:has_abs_path(fname) "{{{
  if a:fname =~ '\(^.:\)\|\(^/\)'
    return 1
  endif
  return 0
endfunction "}}}

function! s:find_autoload_file(name) " {{{
  for path in split(&runtimepath, ',')
    let fname = path.'/autoload/vimwiki/'.a:name
    if glob(fname) != ''
      return fname
    endif
  endfor
  return ''
endfunction " }}}

function! s:default_CSS_full_name(path) " {{{
  let path = expand(a:path)
  let css_full_name = path.VimwikiGet('css_name')
  return css_full_name
endfunction "}}}

function! s:create_default_CSS(path) " {{{
  let css_full_name = s:default_CSS_full_name(a:path)
  if glob(css_full_name) == ""
    call vimwiki#base#mkdir(fnamemodify(css_full_name, ':p:h'))
    let default_css = s:find_autoload_file('style.css')
    if default_css != ''
      let lines = readfile(default_css)
      call writefile(lines, css_full_name)
      echomsg "Default style.css has been created."
    endif
  endif
endfunction "}}}

function! s:template_full_name(name) "{{{
  if a:name == ''
    let name = VimwikiGet('template_default')
  else
    let name = a:name
  endif

  let fname = expand(VimwikiGet('template_path').
        \ name.VimwikiGet('template_ext'))

  if filereadable(fname)
    return fname
  else
    return ''
  endif
endfunction "}}}

function! s:get_html_template(wikifile, template) "{{{
  " TODO: refactor it!!!
  let lines=[]

  if a:template != ''
    let template_name = s:template_full_name(a:template)
    try
      let lines = readfile(template_name)
      return lines
    catch /E484/
      echomsg 'vimwiki: html template '.template_name.
            \ ' does not exist!'
    endtry
  endif

  let default_tpl = s:template_full_name('')

  if default_tpl == ''
    let default_tpl = s:find_autoload_file('default.tpl')
  endif

  let lines = readfile(default_tpl)
  return lines
endfunction "}}}

function! s:safe_html_tags(line) "{{{
  let line = substitute(a:line,'<','\&lt;', 'g')
  let line = substitute(line,'>','\&gt;', 'g')
  return line
endfunction "}}}

function! s:safe_html(line) "{{{
  " escape & < > when producing HTML text
  " s:lt_pattern, s:gt_pattern depend on g:vimwiki_valid_html_tags
  " and are set in vimwiki#html#Wiki2HTML()
  let line = substitute(a:line, '&', '\&amp;', 'g')
  let line = substitute(line,s:lt_pattern,'\&lt;', 'g')
  let line = substitute(line,s:gt_pattern,'\&gt;', 'g')

  return line
endfunction "}}}

function! s:delete_html_files(path) "{{{
  let htmlfiles = split(glob(a:path.'**/*.html'), '\n')
  for fname in htmlfiles
    " ignore user html files, e.g. search.html,404.html
    if stridx(g:vimwiki_user_htmls, fnamemodify(fname, ":t")) >= 0
      continue
    endif

    " delete if there is no corresponding wiki file
    let subdir = vimwiki#base#subdir(VimwikiGet('path_html'), fname)
    let wikifile = VimwikiGet('path').subdir.
          \fnamemodify(fname, ":t:r").VimwikiGet('ext')
    if filereadable(wikifile)
      continue
    endif

    try
      call delete(fname)
    catch
      echomsg 'vimwiki: Cannot delete '.fname
    endtry
  endfor
endfunction "}}}

function! s:mid(value, cnt) "{{{
  return strpart(a:value, a:cnt, len(a:value) - 2 * a:cnt)
endfunction "}}}

function! s:subst_func(line, regexp, func) " {{{
  " Substitute text found by regexp with result of
  " func(matched) function.

  let pos = 0
  let lines = split(a:line, a:regexp, 1)
  let res_line = ""
  for line in lines
    let res_line = res_line.line
    let matched = matchstr(a:line, a:regexp, pos)
    if matched != ""
      let res_line = res_line.{a:func}(matched)
    endif
    let pos = matchend(a:line, a:regexp, pos)
  endfor
  return res_line
endfunction " }}}

function! s:save_vimwiki_buffer() "{{{
  if &filetype == 'vimwiki'
    silent update
  endif
endfunction "}}}

function! s:get_html_toc(toc_list) "{{{
  " toc_list is list of [level, header_text, header_id]
  " ex: [[1, "Header", "toc1"], [2, "Header2", "toc2"], ...]
  function! s:close_list(toc, plevel, level) "{{{
    let plevel = a:plevel
    while plevel > a:level
      call add(a:toc, '</ul>')
      let plevel -= 1
    endwhile
    return plevel
  endfunction "}}}

  if empty(a:toc_list)
    return []
  endif

  let toc = ['<div class="toc">']
  let level = 0
  let plevel = 0
  for [level, text, id] in a:toc_list
    if level > plevel
      call add(toc, '<ul>')
    elseif level < plevel
      let plevel = s:close_list(toc, plevel, level)
    endif

    let toc_text = s:process_tags_remove_links(text)
    let toc_text = s:process_tags_typefaces(toc_text)
    call add(toc, '<li><a href="#'.id.'">'.toc_text.'</a>')
    let plevel = level
  endfor
  call s:close_list(toc, level, 0)
  call add(toc, '</div>')
  return toc
endfunction "}}}

" insert toc into dest.
function! s:process_toc(dest, placeholders, toc) "{{{
  let toc_idx = 0
  if !empty(a:placeholders)
    for [placeholder, row, idx] in a:placeholders
      let [type, param] = placeholder
      if type == 'toc'
        let toc = a:toc[:]
        if !empty(param)
          call insert(toc, '<h1>'.param.'</h1>')
        endif
        let shift = toc_idx * len(toc)
        call extend(a:dest, toc, row + shift)
        let toc_idx += 1
      endif
    endfor
  endif
endfunction "}}}

" get title.
function! s:process_title(placeholders, default_title) "{{{
  if !empty(a:placeholders)
    for [placeholder, row, idx] in a:placeholders
      let [type, param] = placeholder
      if type == 'title' && !empty(param)
        return param
      endif
    endfor
  endif
  return a:default_title
endfunction "}}}

function! s:is_html_uptodate(wikifile) "{{{
  let tpl_time = -1

  let tpl_file = s:template_full_name('')
  if tpl_file != ''
    let tpl_time = getftime(tpl_file)
  endif

  let wikifile = fnamemodify(a:wikifile, ":p")
  let htmlfile = expand(VimwikiGet('path_html').VimwikiGet('subdir').
        \fnamemodify(wikifile, ":t:r").".html")

  if getftime(wikifile) <= getftime(htmlfile) && tpl_time <= getftime(htmlfile)
    return 1
  endif
  return 0
endfunction "}}}

function! s:html_insert_contents(html_lines, content) "{{{
  let lines = []
  for line in a:html_lines
    if line =~ '%content%'
      let parts = split(line, '%content%', 1)
      if empty(parts)
        call extend(lines, a:content)
      else
        for idx in range(len(parts))
          call add(lines, parts[idx])
          if idx < len(parts) - 1
            call extend(lines, a:content)
          endif
        endfor
      endif
    else
      call add(lines, line)
    endif
  endfor
  return lines
endfunction "}}}
"}}}

" INLINE TAGS "{{{
function! s:tag_eqin(value) "{{{
  " mathJAX wants \( \) for inline maths
  return '\('.s:mid(a:value, 1).'\)'
endfunction "}}}

function! s:tag_em(value) "{{{
  return '<em>'.s:mid(a:value, 1).'</em>'
endfunction "}}}

function! s:tag_strong(value) "{{{
  return '<strong>'.s:mid(a:value, 1).'</strong>'
endfunction "}}}

function! s:tag_todo(value) "{{{
  return '<span class="todo">'.a:value.'</span>'
endfunction "}}}

function! s:tag_strike(value) "{{{
  return '<del>'.s:mid(a:value, 2).'</del>'
endfunction "}}}

function! s:tag_super(value) "{{{
  return '<sup><small>'.s:mid(a:value, 1).'</small></sup>'
endfunction "}}}

function! s:tag_sub(value) "{{{
  return '<sub><small>'.s:mid(a:value, 2).'</small></sub>'
endfunction "}}}

function! s:tag_code(value) "{{{
  return '<code>'.s:safe_html_tags(s:mid(a:value, 1)).'</code>'
endfunction "}}}

"function! s:tag_pre(value) "{{{
"  return '<code>'.s:mid(a:value, 3).'</code>'
"endfunction "}}}

"FIXME dead code?
"function! s:tag_math(value) "{{{
"  return '\['.s:mid(a:value, 3).'\]'
"endfunction "}}}


"{{{ v2.0 links
"   match n-th ARG within {{URL[|ARG1|ARG2|...]}} " {{{
" *c,d,e),...
function! vimwiki#html#incl_match_arg(nn_index)
  let rx = g:vimwiki_rxWikiInclPrefix. g:vimwiki_rxWikiInclUrl
  let rx = rx. repeat(g:vimwiki_rxWikiInclSeparator. g:vimwiki_rxWikiInclArg, a:nn_index-1)
  if a:nn_index > 0
    let rx = rx. g:vimwiki_rxWikiInclSeparator. '\zs'. g:vimwiki_rxWikiInclArg. '\ze'
  endif
  let rx = rx. g:vimwiki_rxWikiInclArgs. g:vimwiki_rxWikiInclSuffix
  return rx
endfunction
"}}}

function! vimwiki#html#linkify_link(src, descr) "{{{
  let src_str = ' href="'.a:src.'"'
  let descr = substitute(a:descr,'^\s*\(.*\)\s*$','\1','')
  let descr = (descr == "" ? a:src : descr)
  let descr_str = (descr =~ g:vimwiki_rxWikiIncl
        \ ? s:tag_wikiincl(descr)
        \ : descr)
  return '<a'.src_str.'>'.descr_str.'</a>'
endfunction "}}}

function! vimwiki#html#linkify_image(src, descr, verbatim_str) "{{{
  let src_str = ' src="'.a:src.'"'
  let descr_str = (a:descr != '' ? ' alt="'.a:descr.'"' : '')
  let verbatim_str = (a:verbatim_str != '' ? ' '.a:verbatim_str : '')
  return '<img'.src_str.descr_str.verbatim_str.' />'
endfunction "}}}

function! s:tag_weblink(value) "{{{
  " Weblink Template -> <a href="url">descr</a>
  let str = a:value
  let url = matchstr(str, g:vimwiki_rxWeblinkMatchUrl)
  let descr = matchstr(str, g:vimwiki_rxWeblinkMatchDescr)
  let line = vimwiki#html#linkify_link(url, descr)
  return line
endfunction "}}}

function! s:tag_wikiincl(value) "{{{
  " {{imgurl|arg1|arg2}}    -> ???
  " {{imgurl}}                -> <img src="imgurl"/>
  " {{imgurl|descr|style="A"}} -> <img src="imgurl" alt="descr" style="A" />
  " {{imgurl|descr|class="B"}} -> <img src="imgurl" alt="descr" class="B" />
  let str = a:value
  " custom transclusions
  let line = VimwikiWikiIncludeHandler(str)
  " otherwise, assume image transclusion
  if line == ''
    let url_0 = matchstr(str, g:vimwiki_rxWikiInclMatchUrl)
    let descr = matchstr(str, vimwiki#html#incl_match_arg(1))
    let verbatim_str = matchstr(str, vimwiki#html#incl_match_arg(2))
    " resolve url
    let [idx, scheme, path, subdir, lnk, ext, url] =
          \ vimwiki#base#resolve_scheme(url_0, 1)
    " generate html output
    " TODO: migrate non-essential debugging messages into g:VimwikiLog
    if g:vimwiki_debug > 1
      echom '{{idx='.idx.', scheme='.scheme.', path='.path.', subdir='.subdir.', lnk='.lnk.', ext='.ext.'}}'
    endif

    " Issue 343: Image transclusions: schemeless links have .html appended.
    " If link is schemeless pass it as it is
    if scheme == ''
      let url = lnk
    endif

    let url = escape(url, '#')
    let line = vimwiki#html#linkify_image(url, descr, verbatim_str)
    return line
  endif
  return line
endfunction "}}}

function! s:tag_wikilink(value) "{{{
  " [[url]]                -> <a href="url.html">url</a>
  " [[url|descr]]         -> <a href="url.html">descr</a>
  " [[url|{{...}}]]        -> <a href="url.html"> ... </a>
  " [[fileurl.ext|descr]] -> <a href="fileurl.ext">descr</a>
  " [[dirurl/|descr]]     -> <a href="dirurl/index.html">descr</a>
  let str = a:value
  let url = matchstr(str, g:vimwiki_rxWikiLinkMatchUrl)
  let descr = matchstr(str, g:vimwiki_rxWikiLinkMatchDescr)
  let descr = (substitute(descr,'^\s*\(.*\)\s*$','\1','') != '' ? descr : url)

  " resolve url
  let [idx, scheme, path, subdir, lnk, ext, url] =
        \ vimwiki#base#resolve_scheme(url, 1)

  " generate html output
  " TODO: migrate non-essential debugging messages into g:VimwikiLog
  if g:vimwiki_debug > 1
    echom '[[idx='.idx.', scheme='.scheme.', path='.path.', subdir='.subdir.', lnk='.lnk.', ext='.ext.']]'
  endif
  let line = vimwiki#html#linkify_link(url, descr)
  return line
endfunction "}}}
"}}}


function! s:tag_remove_internal_link(value) "{{{
  let value = s:mid(a:value, 2)

  let line = ''
  if value =~ '|'
    let link_parts = split(value, "|", 1)
  else
    let link_parts = split(value, "][", 1)
  endif

  if len(link_parts) > 1
    if len(link_parts) < 3
      let style = ""
    else
      let style = link_parts[2]
    endif
    let line = link_parts[1]
  else
    let line = value
  endif
  return line
endfunction "}}}

function! s:tag_remove_external_link(value) "{{{
  let value = s:mid(a:value, 1)

  let line = ''
  if s:is_web_link(value)
    let lnkElements = split(value)
    let head = lnkElements[0]
    let rest = join(lnkElements[1:])
    if rest==""
      let rest=head
    endif
    let line = rest
  elseif s:is_img_link(value)
    let line = '<img src="'.value.'" />'
  else
    " [alskfj sfsf] shouldn't be a link. So return it as it was --
    " enclosed in [...]
    let line = '['.value.']'
  endif
  return line
endfunction "}}}

">>> LJ
function! s:tag_namelink(value) "{{{
  let anchor = substitute(a:value, '"', '', 'g')
  return '<a href="#' . anchor . '">' . a:value . '</a>'
endfunction "}}}

function! s:make_tag(line, regexp, func) "{{{
  " Make tags for a given matched regexp.
  " Exclude preformatted text and href links.
  " FIXME
  let patt_splitter = '\(`[^`]\+`\)\|'.
                    \ '\('.g:vimwiki_rxPreStart.'.\+'.g:vimwiki_rxPreEnd.'\)\|'.
                    \ '\(<a href.\{-}</a>\)\|'.
                    \ '\(<img src.\{-}/>\)\|'.
      	            \ '\('.g:vimwiki_rxEqIn.'\)'

  "FIXME FIXME !!! these can easily occur on the same line!
  "XXX  {{{ }}} ??? obsolete
  if '`[^`]\+`' == a:regexp || '{{{.\+}}}' == a:regexp || g:vimwiki_rxEqIn == a:regexp
    let res_line = s:subst_func(a:line, a:regexp, a:func)
  else
    let pos = 0
    " split line with patt_splitter to have parts of line before and after
    " href links, preformatted text
    " ie:
    " hello world `is just a` simple <a href="link.html">type of</a> prg.
    " result:
    " ['hello world ', ' simple ', 'type of', ' prg']
    let lines = split(a:line, patt_splitter, 1)
    let res_line = ""
    for line in lines
      let res_line = res_line.s:subst_func(line, a:regexp, a:func)
      let res_line = res_line.matchstr(a:line, patt_splitter, pos)
      let pos = matchend(a:line, patt_splitter, pos)
    endfor
  endif
  return res_line
endfunction "}}}

function! s:process_tags_remove_links(line) " {{{
  let line = a:line
  let line = s:make_tag(line, '\[\[.\{-}\]\]', 's:tag_remove_internal_link')
  let line = s:make_tag(line, '\[.\{-}\]', 's:tag_remove_external_link')
  return line
endfunction " }}}

function! s:process_tags_typefaces(line) "{{{
  let line = a:line
  let line = s:make_tag(line, g:vimwiki_rxItalic, 's:tag_em')
  let line = s:make_tag(line, g:vimwiki_rxBold, 's:tag_strong')
  let line = s:make_tag(line, g:vimwiki_rxTodo, 's:tag_todo')
  let line = s:make_tag(line, g:vimwiki_rxDelText, 's:tag_strike')
  let line = s:make_tag(line, g:vimwiki_rxSuperScript, 's:tag_super')
  let line = s:make_tag(line, g:vimwiki_rxSubScript, 's:tag_sub')
  let line = s:make_tag(line, g:vimwiki_rxCode, 's:tag_code')
  let line = s:make_tag(line, g:vimwiki_rxEqIn, 's:tag_eqin')
  " >>> LJ
  " refer to chapter [xxx]
  " refer to chapter "xxx"
  let line = s:make_tag(line, '\v\c(refer to chapter|参考)\s*((\[\zs[^]]+\ze\])|("\zs[^"]+\ze"))', 's:tag_namelink')
  return line
endfunction " }}}

function! s:process_tags_links(line) " {{{
  let line = a:line
  let line = s:make_tag(line, g:vimwiki_rxWikiLink, 's:tag_wikilink')
  let line = s:make_tag(line, g:vimwiki_rxWikiIncl, 's:tag_wikiincl')
  let line = s:make_tag(line, g:vimwiki_rxWeblink, 's:tag_weblink')
  return line
endfunction " }}}

function! s:process_inline_tags(line) "{{{
  let line = s:process_tags_links(a:line)
  let line = s:process_tags_typefaces(line)
  return line
endfunction " }}}
"}}}

" BLOCK TAGS {{{
function! s:close_tag_pre(pre, ldest) "{{{
  if a:pre[0]
    call insert(a:ldest, "</pre>")
    return 0
  endif
  return a:pre
endfunction "}}}

function! s:close_tag_math(math, ldest) "{{{
  if a:math[0]
    call insert(a:ldest, "\\\]")
    return 0
  endif
  return a:math
endfunction "}}}

function! s:close_tag_quote(quote, ldest) "{{{
  if a:quote
    call insert(a:ldest, "</blockquote>")
    return 0
  endif
  return a:quote
endfunction "}}}

function! s:close_tag_para(para, ldest) "{{{
  if a:para
    call insert(a:ldest, "</p>")
    return 0
  endif
  return a:para
endfunction "}}}

function! s:close_tag_table(table, ldest) "{{{
  " The first element of table list is a string which tells us if table should be centered.
  " The rest elements are rows which are lists of columns:
  " ['center',
  "   [ CELL1, CELL2, CELL3 ],
  "   [ CELL1, CELL2, CELL3 ],
  "   [ CELL1, CELL2, CELL3 ],
  " ]
  " And CELLx is: { 'body': 'col_x', 'rowspan': r, 'colspan': c }

  function! s:sum_rowspan(table) "{{{
    let table = a:table

    " Get max cells
    let max_cells = 0
    for row in table[1:]
      let n_cells = len(row)
      if n_cells > max_cells
        let max_cells = n_cells
      end
    endfor

    " Sum rowspan
    for cell_idx in range(max_cells)
      let rows = 1

      for row_idx in range(len(table)-1, 1, -1)
        if cell_idx >= len(table[row_idx])
          let rows = 1
          continue
        endif

        if table[row_idx][cell_idx].rowspan == 0
          let rows += 1
        else " table[row_idx][cell_idx].rowspan == 1
          let table[row_idx][cell_idx].rowspan = rows
          let rows = 1
        endif
      endfor
    endfor
  endfunction "}}}

  function! s:sum_colspan(table) "{{{
    for row in a:table[1:]
      let cols = 1

      for cell_idx in range(len(row)-1, 0, -1)
        if row[cell_idx].colspan == 0
          let cols += 1
        else "row[cell_idx].colspan == 1
          let row[cell_idx].colspan = cols
          let cols = 1
        endif
      endfor
    endfor
  endfunction "}}}

  function! s:close_tag_row(row, header, ldest) "{{{
    call add(a:ldest, '<tr>')

    " Set tag element of columns
    if a:header
      let tag_name = 'th'
    else
      let tag_name = 'td'
    end

    " Close tag of columns
    for cell in a:row
      if cell.rowspan == 0 || cell.colspan == 0
        continue
      endif

      if cell.rowspan > 1
        let rowspan_attr = ' rowspan="' . cell.rowspan . '"'
      else "cell.rowspan == 1
        let rowspan_attr = ''
      endif
      if cell.colspan > 1
        let colspan_attr = ' colspan="' . cell.colspan . '"'
      else "cell.colspan == 1
        let colspan_attr = ''
      endif

      call add(a:ldest, '<' . tag_name . rowspan_attr . colspan_attr .'>')
      call add(a:ldest, s:process_inline_tags(cell.body))
      call add(a:ldest, '</'. tag_name . '>')
    endfor

    call add(a:ldest, '</tr>')
  endfunction "}}}

  let table = a:table
  let ldest = a:ldest
  if len(table)
    call s:sum_rowspan(table)
    call s:sum_colspan(table)

    if table[0] == 'center'
      call add(ldest, "<table class='center'>")
    else
      call add(ldest, "<table>")
    endif

    " Empty lists are table separators.
    " Search for the last empty list. All the above rows would be a table header.
    " We should exclude the first element of the table list as it is a text tag
    " that shows if table should be centered or not.
    let head = 0
    for idx in range(len(table)-1, 1, -1)
      if empty(table[idx])
        let head = idx
        break
      endif
    endfor
    if head > 0
      for row in table[1 : head-1]
        if !empty(filter(row, '!empty(v:val)'))
          call s:close_tag_row(row, 1, ldest)
        endif
      endfor
      for row in table[head+1 :]
        call s:close_tag_row(row, 0, ldest)
      endfor
    else
      for row in table[1 :]
        call s:close_tag_row(row, 0, ldest)
      endfor
    endif
    call add(ldest, "</table>")
    let table = []
  endif
  return table
endfunction "}}}

function! s:close_tag_list(lists, ldest) "{{{
  while len(a:lists)
    let item = remove(a:lists, 0)
    call insert(a:ldest, item[0])
  endwhile
endfunction! "}}}

function! s:close_tag_def_list(deflist, ldest) "{{{
  if a:deflist
    call insert(a:ldest, "</dl>")
    return 0
  endif
  return a:deflist
endfunction! "}}}

function! s:process_tag_pre(line, pre) "{{{
  " pre is the list of [is_in_pre, indent_of_pre]
  "XXX always outputs a single line or empty list!
  let lines = []
  let pre = a:pre
  let processed = 0
  "XXX huh?
  "if !pre[0] && a:line =~ '^\s*{{{[^\(}}}\)]*\s*$'
  if !pre[0] && a:line =~ '^\s*{{{'
    let class = matchstr(a:line, '{{{\zs.*$')
    "FIXME class cannot contain arbitrary strings
    let class = substitute(class, '\s\+$', '', 'g')
    if class != ""
      call add(lines, "<pre ".class.">")
    else
      call add(lines, "<pre>")
    endif
    let pre = [1, len(matchstr(a:line, '^\s*\ze{{{'))]
    let processed = 1
  elseif pre[0] && a:line =~ '^\s*}}}\s*$'
    let pre = [0, 0]
    call add(lines, "</pre>")
    let processed = 1
  elseif pre[0]
    let processed = 1
    "XXX destroys indent in general!
    "call add(lines, substitute(a:line, '^\s\{'.pre[1].'}', '', ''))
    call add(lines, s:safe_html_tags(a:line))
  endif
  return [processed, lines, pre]
endfunction "}}}

function! s:process_tag_math(line, math) "{{{
  " math is the list of [is_in_math, indent_of_math]
  let lines = []
  let math = a:math
  let processed = 0
  if !math[0] && a:line =~ '^\s*{{\$[^\(}}$\)]*\s*$'
    let class = matchstr(a:line, '{{$\zs.*$')
    "FIXME class cannot be any string!
    let class = substitute(class, '\s\+$', '', 'g')
    " Check the math placeholder (default: displaymath)
    let b:vimwiki_mathEnv = matchstr(class, '^%\zs\S\+\ze%')
    if b:vimwiki_mathEnv != ""
        call add(lines, substitute(class, '^%\(\S\+\)%','\\begin{\1}', ''))
    elseif class != ""
      call add(lines, "\\\[".class)
    else
      call add(lines, "\\\[")
    endif
    let math = [1, len(matchstr(a:line, '^\s*\ze{{\$'))]
    let processed = 1
  elseif math[0] && a:line =~ '^\s*}}\$\s*$'
    let math = [0, 0]
    if b:vimwiki_mathEnv != ""
      call add(lines, "\\end{".b:vimwiki_mathEnv."}")
    else
      call add(lines, "\\\]")
    endif
    let processed = 1
  elseif math[0]
    let processed = 1
    call add(lines, substitute(a:line, '^\s\{'.math[1].'}', '', ''))
  endif
  return [processed, lines, math]
endfunction "}}}

function! s:process_tag_quote(line, quote) "{{{
  let lines = []
  let quote = a:quote
  let processed = 0
  if a:line =~ '^\s\{4,}\S'
    if !quote
      call add(lines, "<blockquote>")
      let quote = 1
    endif
    let processed = 1
    call add(lines, substitute(a:line, '^\s*', '', ''))
  elseif quote
    call add(lines, "</blockquote>")
    let quote = 0
  endif
  return [processed, lines, quote]
endfunction "}}}

function! s:process_tag_list(line, lists) "{{{

  function! s:add_checkbox(line, rx_list, st_tag, en_tag) "{{{
    let st_tag = a:st_tag
    let en_tag = a:en_tag

    let chk = matchlist(a:line, a:rx_list)
    if len(chk) > 0
      if len(chk[1])>0
        "wildcard characters are difficult to match correctly
        if chk[1] =~ '[.*\\^$~]'
          let chk[1] ='\'.chk[1]
        endif
        " let completion = match(g:vimwiki_listsyms, '\C' . chk[1])
        let completion = s:get_completion_index(chk[1])
        if completion >= 0 && completion <=4
          let st_tag = '<li class="done'.completion.'">'
        endif
      endif
    endif
    return [st_tag, en_tag]
  endfunction "}}}

  let in_list = (len(a:lists) > 0)

  " If it is not list yet then do not process line that starts from *bold*
  " text.
  if !in_list
    let pos = match(a:line, g:vimwiki_rxBold)
    if pos != -1 && strpart(a:line, 0, pos) =~ '^\s*$'
      return [0, []]
    endif
  endif

  let lines = []
  let processed = 0

  if a:line =~ g:vimwiki_rxListBullet
    let lstSym = matchstr(a:line, '[*-]')
    let lstTagOpen = '<ul>'
    let lstTagClose = '</ul>'
    let lstRegExp = g:vimwiki_rxListBullet
  elseif a:line =~ g:vimwiki_rxListNumber
    let lstSym = '#'
    let lstTagOpen = '<ol>'
    let lstTagClose = '</ol>'
    let lstRegExp = g:vimwiki_rxListNumber
  else
    let lstSym = ''
    let lstTagOpen = ''
    let lstTagClose = ''
    let lstRegExp = ''
  endif

  if lstSym != ''
    " To get proper indent level 'retab' the line -- change all tabs
    " to spaces*tabstop
    let line = substitute(a:line, '\t', repeat(' ', &tabstop), 'g')
    let indent = stridx(line, lstSym)

    let checkbox = '\s*\[\(.\?\)\]\s*'
    let [st_tag, en_tag] = s:add_checkbox(line,
          \ lstRegExp.checkbox, '<li>', '')

    if !in_list
      call add(a:lists, [lstTagClose, indent])
      call add(lines, lstTagOpen)
    elseif (in_list && indent > a:lists[-1][1])
      let item = remove(a:lists, -1)
      call add(lines, item[0])

      call add(a:lists, [lstTagClose, indent])
      call add(lines, lstTagOpen)
    elseif (in_list && indent < a:lists[-1][1])
      while len(a:lists) && indent < a:lists[-1][1]
        let item = remove(a:lists, -1)
        call add(lines, item[0])
      endwhile
    elseif in_list
      let item = remove(a:lists, -1)
      call add(lines, item[0])
    endif

    call add(a:lists, [en_tag, indent])
    call add(lines, st_tag)
    call add(lines,
          \ substitute(a:line, lstRegExp.'\%('.checkbox.'\)\?', '', ''))
    let processed = 1
  elseif in_list > 0 && a:line =~ '^\s\+\S\+'
    if g:vimwiki_list_ignore_newline
      call add(lines, a:line)
    else
      call add(lines, '<br />'.a:line)
    endif
    let processed = 1
  else
    call s:close_tag_list(a:lists, lines)
  endif
  return [processed, lines]
endfunction "}}}

function! s:process_tag_def_list(line, deflist) "{{{
  let lines = []
  let deflist = a:deflist
  let processed = 0
  let matches = matchlist(a:line, '\(^.*\)::\%(\s\|$\)\(.*\)')
  if !deflist && len(matches) > 0
    call add(lines, "<dl>")
    let deflist = 1
  endif
  if deflist && len(matches) > 0
    if matches[1] != ''
      call add(lines, "<dt>".matches[1]."</dt>")
    endif
    if matches[2] != ''
      call add(lines, "<dd>".matches[2]."</dd>")
    endif
    let processed = 1
  elseif deflist
    let deflist = 0
    call add(lines, "</dl>")
  endif
  return [processed, lines, deflist]
endfunction "}}}

function! s:process_tag_para(line, para) "{{{
  let lines = []
  let para = a:para
  let processed = 0
  if a:line =~ '^\s\{,3}\S'
    if !para
      call add(lines, "<p>")
      let para = 1
    endif
    let processed = 1
    call add(lines, a:line)
  elseif para && a:line =~ '^\s*$'
    call add(lines, "</p>")
    let para = 0
  endif
  return [processed, lines, para]
endfunction "}}}

function! s:process_tag_h(line, id) "{{{
  let line = a:line
  let processed = 0
  let h_level = 0
  let h_text = ''
  let h_id = ''

  if a:line =~ g:vimwiki_rxHeader
    let h_level = vimwiki#u#count_first_sym(a:line)
  endif
  if h_level > 0
    let a:id[h_level] += 1
    " reset higher level ids
    " >>> LJ
    let sub_level = max([g:vimwiki_html_header_numbering, h_level]) +1
    " <<<
    for level in range(sub_level, 6)
      let a:id[level] = 0
    endfor

    let centered = 0
    if a:line =~ '^\s\+'
      let centered = 1
    endif

    let h_number = ''
    for l in range(1, h_level-1)
      let h_number .= a:id[l].'.'
    endfor
    let h_number .= a:id[h_level]

    let h_id = 'toc_'.h_number

    let h_part = '<h'.h_level.' id="'.h_id.'"'

    if centered
      let h_part .= ' class="justcenter">'
    else
      let h_part .= '>'
    endif

    let h_text = vimwiki#u#trim(matchstr(line, g:vimwiki_rxHeader))
    " >>>LJ
    let a_part = '<a name="' . h_text . '">'

    if g:vimwiki_html_header_numbering
      let num = matchstr(h_number,
            \ '^\(\d.\)\{'.(g:vimwiki_html_header_numbering-1).'}\zs.*')
      if !empty(num)
        let num .= g:vimwiki_html_header_numbering_sym
      endif
      let h_text = num.' '.h_text
    endif

    let line = h_part.a_part.h_text.'</a></h'.h_level.'>'
    let processed = 1
  endif
  return [processed, line, h_level, h_text, h_id]
endfunction "}}}

function! s:process_tag_hr(line) "{{{
  let line = a:line
  let processed = 0
  if a:line =~ '^-----*$'
    let line = '<hr />'
    let processed = 1
  endif
  return [processed, line]
endfunction "}}}

function! s:process_tag_table(line, table) "{{{
  function! s:table_empty_cell(value) "{{{
    let cell = {}

    if a:value =~ '^\s*\\/\s*$'
      let cell.body    = ''
      let cell.rowspan = 0
      let cell.colspan = 1
    elseif a:value =~ '^\s*&gt;\s*$'
      let cell.body    = ''
      let cell.rowspan = 1
      let cell.colspan = 0
    elseif a:value =~ '^\s*$'
      let cell.body    = '&nbsp;'
      let cell.rowspan = 1
      let cell.colspan = 1
    else
      let cell.body    = a:value
      let cell.rowspan = 1
      let cell.colspan = 1
    endif

    return cell
  endfunction "}}}

  function! s:table_add_row(table, line) "{{{
    if empty(a:table)
      if a:line =~ '^\s\+'
        let row = ['center', []]
      else
        let row = ['normal', []]
      endif
    else
      let row = [[]]
    endif
    return row
  endfunction "}}}

  let table = a:table
  let lines = []
  let processed = 0

  if vimwiki#tbl#is_separator(a:line)
    call extend(table, s:table_add_row(a:table, a:line))
    let processed = 1
  elseif vimwiki#tbl#is_table(a:line)
    call extend(table, s:table_add_row(a:table, a:line))

    let processed = 1
    " let cells = split(a:line, vimwiki#tbl#cell_splitter(), 1)[1: -2]
    let cells = vimwiki#tbl#get_cells(a:line)
    call map(cells, 's:table_empty_cell(v:val)')
    call extend(table[-1], cells)
  else
    let table = s:close_tag_table(table, lines)
  endif
  return [processed, lines, table]
endfunction "}}}

"}}}

" }}}

" WIKI2HTML "{{{
function! s:parse_line(line, state) " {{{
  let state = {}
  let state.para = a:state.para
  let state.quote = a:state.quote
  let state.pre = a:state.pre[:]
  let state.math = a:state.math[:]
  let state.table = a:state.table[:]
  let state.lists = a:state.lists[:]
  let state.deflist = a:state.deflist
  let state.placeholder = a:state.placeholder
  let state.toc = a:state.toc
  let state.toc_id = a:state.toc_id

  let res_lines = []

  let line = s:safe_html(a:line)

  let processed = 0

  if !processed
    if line =~ g:vimwiki_rxComment
      let processed = 1
    endif
  endif

  " >>>LJ
  " nohtml -- placeholder
  if !processed
    if line =~ '^%nohtml'
      let processed = 1
      let state.placeholder = ['nohtml']
    endif
  endif

  " title -- placeholder
  if !processed
    if line =~ '^%title'
      let processed = 1
      let param = matchstr(line, '^\s*%title\s\zs.*')
      let state.placeholder = ['title', param]
    endif
  endif

  " html template -- placeholder "{{{
  if !processed
    if line =~ '^%template'
      let processed = 1
      let param = matchstr(line, '^%template\s\zs.*')
      let state.placeholder = ['template', param]
    endif
  endif
  "}}}

  " toc -- placeholder "{{{
  if !processed
    if line =~ '^%toc'
      let processed = 1
      let param = matchstr(line, '^%toc\s\zs.*')
      let state.placeholder = ['toc', param]
    endif
  endif
  "}}}

  " pres "{{{
  if !processed
    let [processed, lines, state.pre] = s:process_tag_pre(line, state.pre)
    " pre is just fine to be in the list -- do not close list item here.
    " if processed && len(state.lists)
      " call s:close_tag_list(state.lists, lines)
    " endif
    if !processed
      let [processed, lines, state.math] = s:process_tag_math(line, state.math)
    endif
    if processed && len(state.table)
      let state.table = s:close_tag_table(state.table, lines)
    endif
    if processed && state.deflist
      let state.deflist = s:close_tag_def_list(state.deflist, lines)
    endif
    if processed && state.quote
      let state.quote = s:close_tag_quote(state.quote, lines)
    endif
    if processed && state.para
      let state.para = s:close_tag_para(state.para, lines)
    endif
    call extend(res_lines, lines)
  endif
  "}}}

  " lists "{{{
  if !processed
    let [processed, lines] = s:process_tag_list(line, state.lists)
    if processed && state.quote
      let state.quote = s:close_tag_quote(state.quote, lines)
    endif
    if processed && state.pre[0]
      let state.pre = s:close_tag_pre(state.pre, lines)
    endif
    if processed && state.math[0]
      let state.math = s:close_tag_math(state.math, lines)
    endif
    if processed && len(state.table)
      let state.table = s:close_tag_table(state.table, lines)
    endif
    if processed && state.deflist
      let state.deflist = s:close_tag_def_list(state.deflist, lines)
    endif
    if processed && state.para
      let state.para = s:close_tag_para(state.para, lines)
    endif

    call map(lines, 's:process_inline_tags(v:val)')

    call extend(res_lines, lines)
  endif
  "}}}

  " headers "{{{
  if !processed
    let [processed, line, h_level, h_text, h_id] = s:process_tag_h(line, state.toc_id)
    if processed
      call s:close_tag_list(state.lists, res_lines)
      let state.table = s:close_tag_table(state.table, res_lines)
      let state.pre = s:close_tag_pre(state.pre, res_lines)
      let state.math = s:close_tag_math(state.math, res_lines)
      let state.quote = s:close_tag_quote(state.quote, res_lines)
      let state.para = s:close_tag_para(state.para, res_lines)

      let line = s:process_inline_tags(line)

      call add(res_lines, line)

      " gather information for table of contents
      call add(state.toc, [h_level, h_text, h_id])
    endif
  endif
  "}}}

  " tables "{{{
  if !processed
    let [processed, lines, state.table] = s:process_tag_table(line, state.table)
    call extend(res_lines, lines)
  endif
  "}}}

  " quotes "{{{
  if !processed
    let [processed, lines, state.quote] = s:process_tag_quote(line, state.quote)
    if processed && len(state.lists)
      call s:close_tag_list(state.lists, lines)
    endif
    if processed && state.deflist
      let state.deflist = s:close_tag_def_list(state.deflist, lines)
    endif
    if processed && len(state.table)
      let state.table = s:close_tag_table(state.table, lines)
    endif
    if processed && state.pre[0]
      let state.pre = s:close_tag_pre(state.pre, lines)
    endif
    if processed && state.math[0]
      let state.math = s:close_tag_math(state.math, lines)
    endif
    if processed && state.para
      let state.para = s:close_tag_para(state.para, lines)
    endif

    call map(lines, 's:process_inline_tags(v:val)')

    call extend(res_lines, lines)
  endif
  "}}}

  " horizontal rules "{{{
  if !processed
    let [processed, line] = s:process_tag_hr(line)
    if processed
      call s:close_tag_list(state.lists, res_lines)
      let state.table = s:close_tag_table(state.table, res_lines)
      let state.pre = s:close_tag_pre(state.pre, res_lines)
      let state.math = s:close_tag_math(state.math, res_lines)
      call add(res_lines, line)
    endif
  endif
  "}}}

  " definition lists "{{{
  if !processed
    let [processed, lines, state.deflist] = s:process_tag_def_list(line, state.deflist)

    call map(lines, 's:process_inline_tags(v:val)')

    call extend(res_lines, lines)
  endif
  "}}}

  "" P "{{{
  if !processed
    let [processed, lines, state.para] = s:process_tag_para(line, state.para)
    if processed && len(state.lists)
      call s:close_tag_list(state.lists, lines)
    endif
    if processed && state.quote
      let state.quote = s:close_tag_quote(state.quote, res_lines)
    endif
    if processed && state.pre[0]
      let state.pre = s:close_tag_pre(state.pre, res_lines)
    endif
    if processed && state.math[0]
      let state.math = s:close_tag_math(state.math, res_lines)
    endif
    if processed && len(state.table)
      let state.table = s:close_tag_table(state.table, res_lines)
    endif

    call map(lines, 's:process_inline_tags(v:val)')

    call extend(res_lines, lines)
  endif
  "}}}

  "" add the rest
  if !processed
    call add(res_lines, line)
  endif

  return [res_lines, state]

endfunction " }}}

function! s:use_custom_wiki2html() "{{{
  let custom_wiki2html = VimwikiGet('custom_wiki2html')
  return !empty(custom_wiki2html) && s:file_exists(custom_wiki2html)
endfunction " }}}

function! vimwiki#html#CustomWiki2HTML(path, wikifile, force) "{{{
  call vimwiki#base#mkdir(a:path)
  echomsg system(VimwikiGet('custom_wiki2html'). ' '.
      \ a:force. ' '.
      \ VimwikiGet('syntax'). ' '.
      \ strpart(VimwikiGet('ext'), 1). ' '.
      \ shellescape(a:path, 1). ' '.
      \ shellescape(a:wikifile, 1). ' '.
      \ shellescape(s:default_CSS_full_name(a:path), 1). ' '.
      \ (len(VimwikiGet('template_path'))    > 1 ? shellescape(expand(VimwikiGet('template_path')), 1) : '-'). ' '.
      \ (len(VimwikiGet('template_default')) > 0 ? VimwikiGet('template_default')                      : '-'). ' '.
      \ (len(VimwikiGet('template_ext'))     > 0 ? VimwikiGet('template_ext')                          : '-'). ' '.
      \ (len(VimwikiGet('subdir'))           > 0 ? shellescape(s:root_path(VimwikiGet('subdir')), 1)   : '-'))
endfunction " }}}

function! vimwiki#html#Wiki2HTML(path_html, wikifile) "{{{

  let starttime = reltime()  " start the clock

  let done = 0

  let wikifile = fnamemodify(a:wikifile, ":p")

  let path_html = expand(a:path_html).VimwikiGet('subdir')
  let htmlfile = fnamemodify(wikifile, ":t:r").'.html'

  if s:use_custom_wiki2html()
    let force = 1
    call vimwiki#html#CustomWiki2HTML(path_html, wikifile, force)
    let done = 1
  endif

  if s:syntax_supported() && done == 0
    let lsource = readfile(wikifile)
    let ldest = []

    "if g:vimwiki_debug
    "  echo 'Generating HTML ... '
    "endif

    call vimwiki#base#mkdir(path_html)

    " nohtml placeholder -- to skip html generation.
    let nohtml = 0

    " template placeholder
    let template_name = ''

    " for table of contents placeholders.
    let placeholders = []

    " current state of converter
    let state = {}
    let state.para = 0
    let state.quote = 0
    let state.pre = [0, 0] " [in_pre, indent_pre]
    let state.math = [0, 0] " [in_math, indent_math]
    let state.table = []
    let state.deflist = 0
    let state.lists = []
    let state.placeholder = []
    let state.toc = []
    let state.toc_id = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 }

    " prepare constants for s:safe_html()
    let s:lt_pattern = '<'
    let s:gt_pattern = '>'
    if g:vimwiki_valid_html_tags != ''
      let tags = join(split(g:vimwiki_valid_html_tags, '\s*,\s*'), '\|')
      let s:lt_pattern = '\c<\%(/\?\%('.tags.'\)\%(\s\{-1}\S\{-}\)\{-}/\?>\)\@!'
      let s:gt_pattern = '\c\%(</\?\%('.tags.'\)\%(\s\{-1}\S\{-}\)\{-}/\?\)\@<!>'
    endif

    for line in lsource
      let oldquote = state.quote
      let [lines, state] = s:parse_line(line, state)

      " Hack: There could be a lot of empty strings before s:process_tag_quote
      " find out `quote` is over. So we should delete them all. Think of the way
      " to refactor it out.
      if oldquote != state.quote
        call s:remove_blank_lines(ldest)
      endif

      if !empty(state.placeholder)
        if state.placeholder[0] == 'nohtml'
          let nohtml = 1
          break
        elseif state.placeholder[0] == 'template'
          let template_name = state.placeholder[1]
        else
          call add(placeholders, [state.placeholder, len(ldest), len(placeholders)])
        endif
        let state.placeholder = []
      endif

      call extend(ldest, lines)
    endfor


    if nohtml
      echon "\r"."%nohtml placeholder found"
      return
    endif

    let toc = s:get_html_toc(state.toc)
    call s:process_toc(ldest, placeholders, toc)
    call s:remove_blank_lines(ldest)

    "" process end of file
    "" close opened tags if any
    let lines = []
    call s:close_tag_quote(state.quote, lines)
    call s:close_tag_para(state.para, lines)
    call s:close_tag_pre(state.pre, lines)
    call s:close_tag_math(state.math, lines)
    call s:close_tag_list(state.lists, lines)
    call s:close_tag_def_list(state.deflist, lines)
    call s:close_tag_table(state.table, lines)
    call extend(ldest, lines)

    let title = s:process_title(placeholders, fnamemodify(a:wikifile, ":t:r"))

    let html_lines = s:get_html_template(a:wikifile, template_name)

    " processing template variables (refactor to a function)
    call map(html_lines, 'substitute(v:val, "%title%", "'. title .'", "g")')
    call map(html_lines, 'substitute(v:val, "%root_path%", "'.
          \ s:root_path(VimwikiGet('subdir')) .'", "g")')

    let css_name = expand(VimwikiGet('css_name'))
    let css_name = substitute(css_name, '\', '/', 'g')
    call map(html_lines, 'substitute(v:val, "%css%", "'. css_name .'", "g")')

    let enc = &fileencoding
    if enc == ''
      let enc = &encoding
    endif
    call map(html_lines, 'substitute(v:val, "%encoding%", "'. enc .'", "g")')

    let html_lines = s:html_insert_contents(html_lines, ldest) " %contents%

    "" make html file.
    call writefile(html_lines, path_html.htmlfile)
    let done = 1

  endif

  if done == 0
    echomsg 'vimwiki: conversion to HTML is not supported for this syntax!!!'
    return
  endif

  " measure the elapsed time
  let time1 = vimwiki#u#time(starttime)  "XXX
  call VimwikiLog_extend('html',[htmlfile,time1])
  "if g:vimwiki_debug
  "  echon "\r".htmlfile.' written (time: '.time1.'s)'
  "endif

  return path_html.htmlfile
endfunction "}}}


function! vimwiki#html#WikiAll2HTML(path_html) "{{{
  if !s:syntax_supported() && !s:use_custom_wiki2html()
    echomsg 'vimwiki: conversion to HTML is not supported for this syntax!!!'
    return
  endif

  echomsg 'Saving vimwiki files...'
  let save_eventignore = &eventignore
  let &eventignore = "all"
  let cur_buf = bufname('%')
  bufdo call s:save_vimwiki_buffer()
  exe 'buffer '.cur_buf
  let &eventignore = save_eventignore

  let path_html = expand(a:path_html)
  call vimwiki#base#mkdir(path_html)

  echomsg 'Deleting non-wiki html files...'
  call s:delete_html_files(path_html)

  echomsg 'Converting wiki to html files...'
  let setting_more = &more
  setlocal nomore

  " temporarily adjust current_subdir global state variable
  let current_subdir = VimwikiGet('subdir')
  let current_invsubdir = VimwikiGet('invsubdir')

  let wikifiles = split(glob(VimwikiGet('path').'**/*'.VimwikiGet('ext')), '\n')
  for wikifile in wikifiles
    let wikifile = fnamemodify(wikifile, ":p")

    " temporarily adjust 'subdir' and 'invsubdir' state variables
    let subdir = vimwiki#base#subdir(VimwikiGet('path'), wikifile)
    call VimwikiSet('subdir', subdir)
    call VimwikiSet('invsubdir', vimwiki#base#invsubdir(subdir))

    if !s:is_html_uptodate(wikifile)
      echomsg 'Processing '.wikifile

      call vimwiki#html#Wiki2HTML(path_html, wikifile)
    else
      echomsg 'Skipping '.wikifile
    endif
  endfor
  " reset 'subdir' state variable
  call VimwikiSet('subdir', current_subdir)
  call VimwikiSet('invsubdir', current_invsubdir)

  call s:create_default_CSS(path_html)
  echomsg 'Done!'

  let &more = setting_more
endfunction "}}}

function! s:file_exists(fname) "{{{
  return !empty(getftype(expand(a:fname)))
endfunction "}}}

" uses VimwikiGet('path')
function! vimwiki#html#get_wikifile_url(wikifile) "{{{
  return VimwikiGet('path_html').
    \ vimwiki#base#subdir(VimwikiGet('path'), a:wikifile).
    \ fnamemodify(a:wikifile, ":t:r").'.html'
endfunction "}}}

function! vimwiki#html#PasteUrl(wikifile) "{{{
  execute 'r !echo file://'.vimwiki#html#get_wikifile_url(a:wikifile)
endfunction "}}}

function! vimwiki#html#CatUrl(wikifile) "{{{
  execute '!echo file://'.vimwiki#html#get_wikifile_url(a:wikifile)
endfunction "}}}
"}}}
autoload/vimwiki/markdown_base.vim	[[[1
302
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki autoload plugin file
" Desc: Link functions for markdown syntax
" Author: Stuart Andrews <stu.andrews@gmail.com> (.. i.e. don't blame Maxim!)
" Home: http://code.google.com/p/vimwiki/


" MISC helper functions {{{

" vimwiki#markdown_base#reset_mkd_refs
function! vimwiki#markdown_base#reset_mkd_refs() "{{{
  call VimwikiClear('markdown_refs')
endfunction "}}}

" vimwiki#markdown_base#scan_reflinks
function! vimwiki#markdown_base#scan_reflinks() " {{{
  let mkd_refs = {}
  " construct list of references using vimgrep
  try
    execute 'vimgrep #'.g:vimwiki_rxMkdRef.'#j %'
  catch /^Vim\%((\a\+)\)\=:E480/   " No Match
    "Ignore it, and move on to the next file
  endtry
  "
  for d in getqflist()
    let matchline = join(getline(d.lnum, min([d.lnum+1, line('$')])), ' ')
    let descr = matchstr(matchline, g:vimwiki_rxMkdRefMatchDescr)
    let url = matchstr(matchline, g:vimwiki_rxMkdRefMatchUrl)
    if descr != '' && url != ''
      let mkd_refs[descr] = url
    endif
  endfor
  call VimwikiSet('markdown_refs', mkd_refs)
  return mkd_refs
endfunction "}}}


" vimwiki#markdown_base#get_reflinks
function! vimwiki#markdown_base#get_reflinks() " {{{
  let done = 1
  try
    let mkd_refs = VimwikiGet('markdown_refs')
  catch
    " work-around hack
    let done = 0
    " ... the following command does not work inside catch block !?
    " > let mkd_refs = vimwiki#markdown_base#scan_reflinks()
  endtry
  if !done
    let mkd_refs = vimwiki#markdown_base#scan_reflinks()
  endif
  return mkd_refs
endfunction "}}}

" vimwiki#markdown_base#open_reflink
" try markdown reference links
function! vimwiki#markdown_base#open_reflink(link) " {{{
  " echom "vimwiki#markdown_base#open_reflink"
  let link = a:link
  let mkd_refs = vimwiki#markdown_base#get_reflinks()
  if has_key(mkd_refs, link)
    let url = mkd_refs[link]
    call vimwiki#base#system_open_link(url)
    return 1
  else
    return 0
  endif
endfunction " }}}

" s:normalize_path
" s:path_html
" vimwiki#base#apply_wiki_options
" vimwiki#base#read_wiki_options
" vimwiki#base#validate_wiki_options
" vimwiki#base#setup_buffer_state
" vimwiki#base#cache_buffer_state
" vimwiki#base#recall_buffer_state
" vimwiki#base#print_wiki_state
" vimwiki#base#mkdir
" vimwiki#base#file_pattern
" vimwiki#base#branched_pattern
" vimwiki#base#subdir
" vimwiki#base#current_subdir
" vimwiki#base#invsubdir
" vimwiki#base#resolve_scheme
" vimwiki#base#system_open_link
" vimwiki#base#open_link
" vimwiki#base#generate_links
" vimwiki#base#goto
" vimwiki#base#backlinks
" vimwiki#base#get_links
" vimwiki#base#edit_file
" vimwiki#base#search_word
" vimwiki#base#matchstr_at_cursor
" vimwiki#base#replacestr_at_cursor
" s:print_wiki_list
" s:update_wiki_link
" s:update_wiki_links_dir
" s:tail_name
" s:update_wiki_links
" s:get_wiki_buffers
" s:open_wiki_buffer
" vimwiki#base#nested_syntax
" }}}

" WIKI link following functions {{{
" vimwiki#base#find_next_link
" vimwiki#base#find_prev_link

" vimwiki#base#follow_link
function! vimwiki#markdown_base#follow_link(split, ...) "{{{ Parse link at cursor and pass
  " to VimwikiLinkHandler, or failing that, the default open_link handler
  " echom "markdown_base#follow_link"

  if 0
    " Syntax-specific links
    " XXX: @Stuart: do we still need it?
    " XXX: @Maxim: most likely!  I am still working on a seemless way to
    " integrate regexp's without complicating syntax/vimwiki.vim
  else
    if a:split == "split"
      let cmd = ":split "
    elseif a:split == "vsplit"
      let cmd = ":vsplit "
    elseif a:split == "tabnew"
      let cmd = ":tabnew "
    else
      let cmd = ":e "
    endif

    " try WikiLink
    let lnk = matchstr(vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWikiLink),
          \ g:vimwiki_rxWikiLinkMatchUrl)
    " try WikiIncl
    if lnk == ""
      let lnk = matchstr(vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWikiIncl),
          \ g:vimwiki_rxWikiInclMatchUrl)
    endif
    " try Weblink
    if lnk == ""
      let lnk = matchstr(vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWeblink),
            \ g:vimwiki_rxWeblinkMatchUrl)
    endif

    if lnk != ""
      if !VimwikiLinkHandler(lnk)
        if !vimwiki#markdown_base#open_reflink(lnk)
          call vimwiki#base#open_link(cmd, lnk)
        endif
      endif
      return
    endif

    if a:0 > 0
      execute "normal! ".a:1
    else
      call vimwiki#base#normalize_link(0)
    endif
  endif

endfunction " }}}

" vimwiki#base#go_back_link
" vimwiki#base#goto_index
" vimwiki#base#delete_link
" vimwiki#base#rename_link
" vimwiki#base#ui_select

" TEXT OBJECTS functions {{{
" vimwiki#base#TO_header
" vimwiki#base#TO_table_cell
" vimwiki#base#TO_table_col
" }}}

" HEADER functions {{{
" vimwiki#base#AddHeaderLevel
" vimwiki#base#RemoveHeaderLevel
"}}}

" LINK functions {{{
" vimwiki#base#apply_template

" s:clean_url
" vimwiki#base#normalize_link_helper
" vimwiki#base#normalize_imagelink_helper

" s:normalize_link_syntax_n
function! s:normalize_link_syntax_n() " {{{
  let lnum = line('.')

  " try WikiIncl
  let lnk = vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWikiIncl)
  if !empty(lnk)
    " NO-OP !!
    if g:vimwiki_debug > 1
      echomsg "WikiIncl: ".lnk." Sub: ".lnk
    endif
    return
  endif

  " try WikiLink0: replace with WikiLink1
  let lnk = vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWikiLink0)
  if !empty(lnk)
    let sub = vimwiki#base#normalize_link_helper(lnk,
          \ g:vimwiki_rxWikiLinkMatchUrl, g:vimwiki_rxWikiLinkMatchDescr,
          \ g:vimwiki_WikiLink1Template2)
    call vimwiki#base#replacestr_at_cursor(g:vimwiki_rxWikiLink0, sub)
    if g:vimwiki_debug > 1
      echomsg "WikiLink: ".lnk." Sub: ".sub
    endif
    return
  endif

  " try WikiLink1: replace with WikiLink0
  let lnk = vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWikiLink1)
  if !empty(lnk)
    let sub = vimwiki#base#normalize_link_helper(lnk,
          \ g:vimwiki_rxWikiLinkMatchUrl, g:vimwiki_rxWikiLinkMatchDescr,
          \ g:vimwiki_WikiLinkTemplate2)
    call vimwiki#base#replacestr_at_cursor(g:vimwiki_rxWikiLink1, sub)
    if g:vimwiki_debug > 1
      echomsg "WikiLink: ".lnk." Sub: ".sub
    endif
    return
  endif

  " try Weblink
  let lnk = vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWeblink)
  if !empty(lnk)
    let sub = vimwiki#base#normalize_link_helper(lnk,
          \ g:vimwiki_rxWeblinkMatchUrl, g:vimwiki_rxWeblinkMatchDescr,
          \ g:vimwiki_Weblink1Template)
    call vimwiki#base#replacestr_at_cursor(g:vimwiki_rxWeblink, sub)
    if g:vimwiki_debug > 1
      echomsg "WebLink: ".lnk." Sub: ".sub
    endif
    return
  endif

  " try Word (any characters except separators)
  " rxWord is less permissive than rxWikiLinkUrl which is used in
  " normalize_link_syntax_v
  let lnk = vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWord)
  if !empty(lnk)
    let sub = vimwiki#base#normalize_link_helper(lnk,
          \ g:vimwiki_rxWord, '',
          \ g:vimwiki_WikiLinkTemplate1)
    call vimwiki#base#replacestr_at_cursor('\V'.lnk, sub)
    if g:vimwiki_debug > 1
      echomsg "Word: ".lnk." Sub: ".sub
    endif
    return
  endif

endfunction " }}}

" s:normalize_link_syntax_v
function! s:normalize_link_syntax_v() " {{{
  let lnum = line('.')
  let sel_save = &selection
  let &selection = "old"
  let rv = @"
  let rt = getregtype('"')
  let done = 0

  try
    norm! gvy
    let visual_selection = @"
    let visual_selection = substitute(g:vimwiki_WikiLinkTemplate1, '__LinkUrl__', '\='."'".visual_selection."'", '')

    call setreg('"', visual_selection, 'v')

    " paste result
    norm! `>pgvd

  finally
    call setreg('"', rv, rt)
    let &selection = sel_save
  endtry

endfunction " }}}

" vimwiki#base#normalize_link
function! vimwiki#markdown_base#normalize_link(is_visual_mode) "{{{
  if 0
    " Syntax-specific links
  else
    if !a:is_visual_mode
      call s:normalize_link_syntax_n()
    elseif visualmode() ==# 'v' && line("'<") == line("'>")
      " action undefined for 'line-wise' or 'multi-line' visual mode selections
      call s:normalize_link_syntax_v()
    endif
  endif
endfunction "}}}

" }}}

" -------------------------------------------------------------------------
" Load syntax-specific Wiki functionality
" -------------------------------------------------------------------------

autoload/vimwiki/u.vim	[[[1
77
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki autoload plugin file
" Utility functions
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

function! vimwiki#u#trim(string, ...) "{{{
  let chars = ''
  if a:0 > 0
    let chars = a:1
  endif
  let res = substitute(a:string, '^[[:space:]'.chars.']\+', '', '')
  let res = substitute(res, '[[:space:]'.chars.']\+$', '', '')
  return res
endfunction "}}}


" Builtin cursor doesn't work right with unicode characters.
function! vimwiki#u#cursor(lnum, cnum) "{{{
  exe a:lnum
  exe 'normal! 0'.a:cnum.'|'
endfunction "}}}

function! vimwiki#u#is_windows() "{{{
  return has("win32") || has("win64") || has("win95") || has("win16")
endfunction "}}}

function! vimwiki#u#chomp_slash(str) "{{{
  return substitute(a:str, '[/\\]\+$', '', '')
endfunction "}}}

function! vimwiki#u#time(starttime) "{{{
  " measure the elapsed time and cut away miliseconds and smaller
  return matchstr(reltimestr(reltime(a:starttime)),'\d\+\(\.\d\d\)\=')
endfunction "}}}

function! vimwiki#u#path_norm(path) "{{{
  " /-slashes
  let path = substitute(a:path, '\', '/', 'g')
  " treat multiple consecutive slashes as one path separator
  let path = substitute(path, '/\+', '/', 'g')
  " ensure that we are not fooled by a symbolic link
  return resolve(path)
endfunction "}}}

function! vimwiki#u#is_link_to_dir(link) "{{{
  " Check if link is to a directory.
  " It should be ended with \ or /.
  if a:link =~ '.\+[/\\]$'
    return 1
  endif
  return 0
endfunction " }}}

function! vimwiki#u#count_first_sym(line) "{{{
  let first_sym = matchstr(a:line, '\S')
  return len(matchstr(a:line, first_sym.'\+'))
endfunction "}}}

" return longest common path prefix of 2 given paths.
" '~/home/usrname/wiki', '~/home/usrname/wiki/shmiki' => '~/home/usrname/wiki'
function! vimwiki#u#path_common_pfx(path1, path2) "{{{
  let p1 = split(a:path1, '[/\\]', 1)
  let p2 = split(a:path2, '[/\\]', 1)

  let idx = 0
  let minlen = min([len(p1), len(p2)])
  while (idx < minlen) && (p1[idx] ==? p2[idx])
    let idx = idx + 1
  endwhile
  if idx == 0
    return ''
  else
    return join(p1[: idx-1], '/')
  endif
endfunction "}}}

autoload/vimwiki/diary.vim	[[[1
358
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki autoload plugin file
" Desc: Handle diary notes
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

" Load only once {{{
if exists("g:loaded_vimwiki_diary_auto") || &cp
  finish
endif
let g:loaded_vimwiki_diary_auto = 1
"}}}

let s:vimwiki_max_scan_for_caption = 5

" Helpers {{{
function! s:prefix_zero(num) "{{{
  if a:num < 10
    return '0'.a:num
  endif
  return a:num
endfunction "}}}

function! s:get_date_link(fmt) "{{{
  return strftime(a:fmt)
endfunction "}}}

function! s:link_exists(lines, link) "{{{
  let link_exists = 0
  for line in a:lines
    if line =~ escape(a:link, '[]\')
      let link_exists = 1
      break
    endif
  endfor
  return link_exists
endfunction "}}}

function! s:diary_path(...) "{{{
  let idx = a:0 == 0 ? g:vimwiki_current_idx : a:1
  return VimwikiGet('path', idx).VimwikiGet('diary_rel_path', idx)
endfunction "}}}

function! s:diary_index(...) "{{{
  let idx = a:0 == 0 ? g:vimwiki_current_idx : a:1
  return s:diary_path(idx).VimwikiGet('diary_index', idx).VimwikiGet('ext', idx)
endfunction "}}}

function! s:diary_date_link(...) "{{{
  let idx = a:0 == 0 ? g:vimwiki_current_idx : a:1
  return s:get_date_link(VimwikiGet('diary_link_fmt', idx))
endfunction "}}}

function! s:get_position_links(link) "{{{
  let idx = -1
  let links = []
  if a:link =~ '^\d\{4}-\d\d-\d\d'
    let links = keys(s:get_diary_links())
    " include 'today' into links
    if index(links, s:diary_date_link()) == -1
      call add(links, s:diary_date_link())
    endif
    call sort(links)
    let idx = index(links, a:link)
  endif
  return [idx, links]
endfunction "}}}

fun! s:get_month_name(month) "{{{
  return g:vimwiki_diary_months[str2nr(a:month)]
endfun "}}}

" Helpers }}}

" Diary index stuff {{{
fun! s:read_captions(files) "{{{
  let result = {}
  for fl in a:files
    " remove paths and extensions
    let fl_key = fnamemodify(fl, ':t:r')

    if filereadable(fl)
      for line in readfile(fl, '', s:vimwiki_max_scan_for_caption)
        if line =~ g:vimwiki_rxHeader && !has_key(result, fl_key)
          let result[fl_key] = vimwiki#u#trim(matchstr(line, g:vimwiki_rxHeader))
        endif
      endfor
    endif

    if !has_key(result, fl_key)
      let result[fl_key] = ''
    endif

  endfor
  return result
endfun "}}}

fun! s:get_diary_links(...) "{{{
  let rx = '^\d\{4}-\d\d-\d\d'
  let s_files = glob(VimwikiGet('path').VimwikiGet('diary_rel_path').'*'.VimwikiGet('ext'))
  let files = split(s_files, '\n')
  call filter(files, 'fnamemodify(v:val, ":t") =~ "'.escape(rx, '\').'"')

  " remove backup files (.wiki~)
  call filter(files, 'v:val !~ ''.*\~$''')

  if a:0
    call add(files, a:1)
  endif
  let links_with_captions = s:read_captions(files)

  return links_with_captions
endfun "}}}

fun! s:group_links(links) "{{{
  let result = {}
  let p_year = 0
  let p_month = 0
  for fl in sort(keys(a:links))
    let year = strpart(fl, 0, 4)
    let month = strpart(fl, 5, 2)
    if p_year != year
      let result[year] = {}
      let p_month = 0
    endif
    if p_month != month
      let result[year][month] = {}
    endif
    let result[year][month][fl] = a:links[fl]
    let p_year = year
    let p_month = month
  endfor
  return result
endfun "}}}

fun! s:sort(lst) "{{{
  if VimwikiGet("diary_sort") == 'desc'
    return reverse(sort(a:lst))
  else
    return sort(a:lst)
  endif
endfun "}}}

fun! s:format_diary(...) "{{{
  let result = []

  call add(result, substitute(g:vimwiki_rxH1_Template, '__Header__', VimwikiGet('diary_header'), ''))

  if a:0
    let g_files = s:group_links(s:get_diary_links(a:1))
  else
    let g_files = s:group_links(s:get_diary_links())
  endif

  " for year in s:rev(sort(keys(g_files)))
  for year in s:sort(keys(g_files))
    call add(result, '')
    call add(result, substitute(g:vimwiki_rxH2_Template, '__Header__', year , ''))

    " for month in s:rev(sort(keys(g_files[year])))
    for month in s:sort(keys(g_files[year]))
      call add(result, '')
      call add(result, substitute(g:vimwiki_rxH3_Template, '__Header__', s:get_month_name(month), ''))

      " for [fl, cap] in s:rev(sort(items(g_files[year][month])))
      for [fl, cap] in s:sort(items(g_files[year][month]))
        if empty(cap)
          let entry = substitute(g:vimwiki_WikiLinkTemplate1, '__LinkUrl__', fl, '')
          let entry = substitute(entry, '__LinkDescription__', cap, '')
          call add(result, repeat(' ', &sw).'* '.entry)
        else
          let entry = substitute(g:vimwiki_WikiLinkTemplate2, '__LinkUrl__', fl, '')
          let entry = substitute(entry, '__LinkDescription__', cap, '')
          call add(result, repeat(' ', &sw).'* '.entry)
        endif
      endfor

    endfor
  endfor
  call add(result, '')

  return result
endfun "}}}

function! s:delete_diary_section() "{{{
  " remove diary section
  let old_pos = getpos('.')
  let ln_start = -1
  let ln_end = -1
  call cursor(1, 1)
  if search(substitute(g:vimwiki_rxH1_Template, '__Header__', VimwikiGet('diary_header'), ''), 'Wc')
    let ln_start = line('.')
    if search(g:vimwiki_rxH1, 'W')
      let ln_end = line('.') - 1
    else
      let ln_end = line('$')
    endif
  endif

  if ln_start < 0 || ln_end < 0
    call setpos('.', old_pos)
    return
  endif

  if !&readonly
    exe ln_start.",".ln_end."delete _"
  endif

  call setpos('.', old_pos)
endfunction "}}}

function! s:insert_diary_section() "{{{
  if !&readonly
    let ln = line('.')
    call append(ln, s:format_diary())
    if ln == 1 && getline(ln) == ''
      1,1delete
    endif
  endif
endfunction "}}}

" Diary index stuff }}}

function! vimwiki#diary#make_note(wnum, ...) "{{{
  if a:wnum > len(g:vimwiki_list)
    echom "vimwiki: Wiki ".a:wnum." is not registered in g:vimwiki_list!"
    return
  endif

  " TODO: refactor it. base#goto_index uses the same
  if a:wnum > 0
    let idx = a:wnum - 1
  else
    let idx = 0
  endif

  call vimwiki#base#validate_wiki_options(idx)
  call vimwiki#base#mkdir(VimwikiGet('path', idx).VimwikiGet('diary_rel_path', idx))

  if a:0 && a:1 == 1
    let cmd = 'tabedit'
  else
    let cmd = 'edit'
  endif
  if a:0>1
    let link = 'diary:'.a:2
  else
    let link = 'diary:'.s:diary_date_link(idx)
  endif

  call vimwiki#base#open_link(cmd, link, s:diary_index(idx))
  call vimwiki#base#setup_buffer_state(idx)
endfunction "}}}

function! vimwiki#diary#goto_diary_index(wnum) "{{{
  if a:wnum > len(g:vimwiki_list)
    echom "vimwiki: Wiki ".a:wnum." is not registered in g:vimwiki_list!"
    return
  endif

  " TODO: refactor it. base#goto_index uses the same
  if a:wnum > 0
    let idx = a:wnum - 1
  else
    let idx = 0
  endif

  call vimwiki#base#validate_wiki_options(idx)
  call vimwiki#base#edit_file('e', s:diary_index(idx))
  call vimwiki#base#setup_buffer_state(idx)
endfunction "}}}

function! vimwiki#diary#goto_next_day() "{{{
  let link = ''
  let [idx, links] = s:get_position_links(expand('%:t:r'))

  if idx == (len(links) - 1)
    return
  endif

  if idx != -1 && idx < len(links) - 1
    let link = 'diary:'.links[idx+1]
  else
    " goto today
    let link = 'diary:'.s:diary_date_link()
  endif

  if len(link)
    call vimwiki#base#open_link(':e ', link)
  endif
endfunction "}}}

function! vimwiki#diary#goto_prev_day() "{{{
  let link = ''
  let [idx, links] = s:get_position_links(expand('%:t:r'))

  if idx == 0
    return
  endif

  if idx > 0
    let link = 'diary:'.links[idx-1]
  else
    " goto today
    let link = 'diary:'.s:diary_date_link()
  endif

  if len(link)
    call vimwiki#base#open_link(':e ', link)
  endif
endfunction "}}}

function! vimwiki#diary#generate_diary_section() "{{{
  let current_file = vimwiki#u#path_norm(expand("%:p"))
  let diary_file = vimwiki#u#path_norm(s:diary_index())
  if  current_file == diary_file
    call s:delete_diary_section()
    call s:insert_diary_section()
  else
    echom "vimwiki: You can generate diary links only in a diary index page!"
  endif
endfunction "}}}

" Calendar.vim {{{
" Callback function.
function! vimwiki#diary#calendar_action(day, month, year, week, dir) "{{{
  let day = s:prefix_zero(a:day)
  let month = s:prefix_zero(a:month)

  let link = a:year.'-'.month.'-'.day
  if winnr('#') == 0
    if a:dir == 'V'
      vsplit
    else
      split
    endif
  else
    wincmd p
    if !&hidden && &modified
      new
    endif
  endif

  " Create diary note for a selected date in default wiki.
  call vimwiki#diary#make_note(1, 0, link)
endfunction "}}}

" Sign function.
function vimwiki#diary#calendar_sign(day, month, year) "{{{
  let day = s:prefix_zero(a:day)
  let month = s:prefix_zero(a:month)
  let sfile = VimwikiGet('path').VimwikiGet('diary_rel_path').
        \ a:year.'-'.month.'-'.day.VimwikiGet('ext')
  return filereadable(expand(sfile))
endfunction "}}}

" Calendar.vim }}}

autoload/vimwiki/base.vim	[[[1
1577
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki autoload plugin file
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

if exists("g:loaded_vimwiki_auto") || &cp
  finish
endif
let g:loaded_vimwiki_auto = 1

" MISC helper functions {{{

" s:normalize_path
function! s:normalize_path(path) "{{{
  let g:VimwikiLog.normalize_path += 1  "XXX
  " resolve doesn't work quite right with symlinks ended with / or \
  return resolve(expand(substitute(a:path, '[/\\]\+$', '', ''))).'/'
endfunction "}}}

" s:path_html
function! s:path_html(idx) "{{{
  let path_html = VimwikiGet('path_html', a:idx)
  if !empty(path_html)
    return path_html
  else
    let g:VimwikiLog.path_html += 1  "XXX
    let path = VimwikiGet('path', a:idx)
    ">>>>LJ
    return substitute(path, '[/\\]\+$', '', '')
    "==== org
    "return substitute(path, '[/\\]\+$', '', '').'_html/'
    "<<<<
  endif
endfunction "}}}

function! vimwiki#base#get_known_extensions() " {{{
  " Getting all extensions that different wikis could have
  let extensions = {}
  for wiki in g:vimwiki_list
    if has_key(wiki, 'ext')
      let extensions[wiki.ext] = 1
    else
      let extensions['.wiki'] = 1
    endif
  endfor
  " append map g:vimwiki_ext2syntax
  for ext in keys(g:vimwiki_ext2syntax)
    let extensions[ext] = 1
  endfor
  return keys(extensions)
endfunction " }}}

function! vimwiki#base#get_known_syntaxes() " {{{
  " Getting all syntaxes that different wikis could have
  let syntaxes = {}
  let syntaxes['default'] = 1
  for wiki in g:vimwiki_list
    if has_key(wiki, 'syntax')
      let syntaxes[wiki.syntax] = 1
    endif
  endfor
  " append map g:vimwiki_ext2syntax
  for syn in values(g:vimwiki_ext2syntax)
    let syntaxes[syn] = 1
  endfor
  return keys(syntaxes)
endfunction " }}}
" }}}

" vimwiki#base#apply_wiki_options
function! vimwiki#base#apply_wiki_options(options) " {{{ Update the current
  " wiki using the options dictionary
  for kk in keys(a:options)
    let g:vimwiki_list[g:vimwiki_current_idx][kk] = a:options[kk]
  endfor
  call vimwiki#base#validate_wiki_options(g:vimwiki_current_idx)
  call vimwiki#base#setup_buffer_state(g:vimwiki_current_idx)
endfunction " }}}

" vimwiki#base#read_wiki_options
function! vimwiki#base#read_wiki_options(check) " {{{ Attempt to read wiki
  " options from the current page's directory, or its ancesters.  If a file
  "   named vimwiki.vimrc is found, which declares a wiki-options dictionary
  "   named g:local_wiki, a message alerts the user that an update has been
  "   found and may be applied.  If the argument check=1, the user is queried
  "   before applying the update to the current wiki's option.

  " Save global vimwiki options ... after all, the global list is often
  "   initialized for the first time in vimrc files, and we don't want to
  "   overwrite !!  (not to mention all the other globals ...)
  let l:vimwiki_list = deepcopy(g:vimwiki_list, 1)
  "
  if a:check > 1
    call vimwiki#base#print_wiki_state()
    echo " \n"
  endif
  "
  let g:local_wiki = {}
  let done = 0
  " ... start the wild-goose chase!
  for invsubdir in ['.', '..', '../..', '../../..']
    " other names are possible, but most vimrc files will cause grief!
    for nm in ['vimwiki.vimrc']
      " TODO: use an alternate strategy, instead of source, to read options
      if done
        continue
      endif
      "
      let local_wiki_options_filename = expand('%:p:h').'/'.invsubdir.'/'.nm
      if !filereadable(local_wiki_options_filename)
        continue
      endif
      "
      echo "\nFound file : ".local_wiki_options_filename
      let query = "Vimwiki: Check for options in this file [Y]es/[n]o? "
      if a:check > 0 && (tolower(input(query)) !~ "y")
        continue
      endif
      "
      try
        execute 'source '.local_wiki_options_filename
      catch
      endtry
      if empty(g:local_wiki)
        continue
      endif
      "
      if a:check > 0
        echo "\n\nFound wiki options\n  g:local_wiki = ".string(g:local_wiki)
        let query = "Vimwiki: Apply these options [Y]es/[n]o? "
        if tolower(input(query)) !~ "y"
          let g:local_wiki = {}
          continue
        endif
      endif
      "
      " restore global list
      " - this prevents corruption by g:vimwiki_list in options_file
      let g:vimwiki_list = deepcopy(l:vimwiki_list, 1)
      "
      call vimwiki#base#apply_wiki_options(g:local_wiki)
      let done = 1
    endfor
  endfor
  if !done
    "
    " restore global list, if no local options were found
    " - this prevents corruption by g:vimwiki_list in options_file
    let g:vimwiki_list = deepcopy(l:vimwiki_list, 1)
    "
  endif
  if a:check > 1
    echo " \n "
    if done
      call vimwiki#base#print_wiki_state()
    else
      echo "Vimwiki: No options were applied."
    endif
  endif
endfunction " }}}

" vimwiki#base#validate_wiki_options
function! vimwiki#base#validate_wiki_options(idx) " {{{ Validate wiki options
  " Only call this function *before* opening a wiki page.
  "
  " XXX: It's too early to update global / buffer variables, because they are
  "  still needed in their existing state for s:setup_buffer_leave()
  "" let g:vimwiki_current_idx = a:idx

  " update normalized path & path_html
  call VimwikiSet('path', s:normalize_path(VimwikiGet('path', a:idx)), a:idx)
  call VimwikiSet('path_html', s:normalize_path(s:path_html(a:idx)), a:idx)
  call VimwikiSet('template_path',
        \ s:normalize_path(VimwikiGet('template_path', a:idx)), a:idx)
  call VimwikiSet('diary_rel_path',
        \ s:normalize_path(VimwikiGet('diary_rel_path', a:idx)), a:idx)

  " XXX: It's too early to update global / buffer variables, because they are
  "  still needed in their existing state for s:setup_buffer_leave()
  "" call vimwiki#base#cache_buffer_state()
endfunction " }}}

" vimwiki#base#setup_buffer_state
function! vimwiki#base#setup_buffer_state(idx) " {{{ Init page-specific variables
  " Only call this function *after* opening a wiki page.
  if a:idx < 0
    return
  endif

  let g:vimwiki_current_idx = a:idx

  " The following state depends on the current active wiki page
  let subdir = vimwiki#base#current_subdir(a:idx)
  call VimwikiSet('subdir', subdir, a:idx)
  call VimwikiSet('invsubdir', vimwiki#base#invsubdir(subdir), a:idx)
  call VimwikiSet('url', vimwiki#html#get_wikifile_url(expand('%:p')), a:idx)

  " update cache
  call vimwiki#base#cache_buffer_state()
endfunction " }}}

" vimwiki#base#cache_buffer_state
function! vimwiki#base#cache_buffer_state() "{{{
  if !exists('g:vimwiki_current_idx') && g:vimwiki_debug
    echo "[Vimwiki Internal Error]: Missing global state variable: 'g:vimwiki_current_idx'"
  endif
  let b:vimwiki_idx = g:vimwiki_current_idx
endfunction "}}}

" vimwiki#base#recall_buffer_state
function! vimwiki#base#recall_buffer_state() "{{{
  if !exists('b:vimwiki_idx')
    if g:vimwiki_debug
      echo "[Vimwiki Internal Error]: Missing buffer state variable: 'b:vimwiki_idx'"
    endif
    return 0
  else
    let g:vimwiki_current_idx = b:vimwiki_idx
    return 1
  endif
endfunction " }}}

" vimwiki#base#print_wiki_state
function! vimwiki#base#print_wiki_state() "{{{ print wiki options
  "   and buffer state variables
  let g_width = 18
  let b_width = 18
  echo "- Wiki Options (idx=".g:vimwiki_current_idx.") -"
  for kk in VimwikiGetOptionNames()
      echo "  '".kk."': ".repeat(' ', g_width-len(kk)).string(VimwikiGet(kk))
  endfor
  if !exists('b:vimwiki_list')
    return
  endif
  echo "- Cached Variables -"
  for kk in keys(b:vimwiki_list)
    echo "  '".kk."': ".repeat(' ', b_width-len(kk)).string(b:vimwiki_list[kk])
  endfor
endfunction "}}}

" vimwiki#base#mkdir
" If the optional argument 'confirm' == 1 is provided,
" vimwiki#base#mkdir will ask before creating a directory
function! vimwiki#base#mkdir(path, ...) "{{{
  let path = expand(a:path)
  if !isdirectory(path) && exists("*mkdir")
    let path = vimwiki#u#chomp_slash(path)
    if vimwiki#u#is_windows() && !empty(g:vimwiki_w32_dir_enc)
      let path = iconv(path, &enc, g:vimwiki_w32_dir_enc)
    endif
    if a:0 && a:1 && tolower(input("Vimwiki: Make new directory: ".path."\n [Y]es/[n]o? ")) !~ "y"
      return 0
    endif
    call mkdir(path, "p")
  endif
  return 1
endfunction " }}}

" vimwiki#base#file_pattern
function! vimwiki#base#file_pattern(files) "{{{ Get search regex from glob()
  " string. Aim to support *all* special characters, forcing the user to choose
  "   names that are compatible with any external restrictions that they
  "   encounter (e.g. filesystem, wiki conventions, other syntaxes, ...).
  "   See: http://code.google.com/p/vimwiki/issues/detail?id=316
  " Change / to [/\\] to allow "Windows paths"
  " TODO: boundary cases ...
  "   e.g. "File$", "^File", "Fi]le", "Fi[le", "Fi\le", "Fi/le"
  " XXX: (remove my comment if agreed) Maxim: with \V (very nomagic) boundary
  " cases works for 1 and 2.
  " 3, 4, 5 is not highlighted as links thus wouldn't be highlighted.
  " 6 is a regular vimwiki link with subdirectory...
  "
  let pattern = vimwiki#base#branched_pattern(a:files,"\n")
  return '\V'.pattern.'\m'
endfunction "}}}

" vimwiki#base#branched_pattern
function! vimwiki#base#branched_pattern(string,separator) "{{{ get search regex
" from a string-list; separators assumed at start and end as well
  let pattern = substitute(a:string, a:separator, '\\|','g')
  let pattern = substitute(pattern, '\%^\\|', '\\%(','')
  let pattern = substitute(pattern,'\\|\%$', '\\)','')
  return pattern
endfunction "}}}

" vimwiki#base#subdir
"FIXME TODO slow and faulty
function! vimwiki#base#subdir(path, filename)"{{{
  let g:VimwikiLog.subdir += 1  "XXX
  let path = a:path
  " ensure that we are not fooled by a symbolic link
  "FIXME if we are not "fooled", we end up in a completely different wiki?
  let filename = resolve(a:filename)
  let idx = 0
  "FIXME this can terminate in the middle of a path component!
  while path[idx] ==? filename[idx]
    let idx = idx + 1
  endwhile

  let p = split(strpart(filename, idx), '[/\\]')
  let res = join(p[:-2], '/')
  if len(res) > 0
    let res = res.'/'
  endif
  return res
endfunction "}}}

" vimwiki#base#current_subdir
function! vimwiki#base#current_subdir(idx)"{{{
  return vimwiki#base#subdir(VimwikiGet('path', a:idx), expand('%:p'))
endfunction"}}}

" vimwiki#base#invsubdir
function! vimwiki#base#invsubdir(subdir) " {{{
  return substitute(a:subdir, '[^/\.]\+/', '../', 'g')
endfunction " }}}

" vimwiki#base#resolve_scheme
function! vimwiki#base#resolve_scheme(lnk, as_html) " {{{ Resolve scheme
  " if link is schemeless add wikiN: scheme
  let lnk = a:lnk
  let is_schemeless = lnk !~ g:vimwiki_rxSchemeUrl
  let lnk = (is_schemeless  ? 'wiki'.g:vimwiki_current_idx.':'.lnk : lnk)

  " Get scheme
  let scheme = matchstr(lnk, g:vimwiki_rxSchemeUrlMatchScheme)
  " Get link (without scheme)
  let lnk = matchstr(lnk, g:vimwiki_rxSchemeUrlMatchUrl)
  let path = ''
  let subdir = ''
  let ext = ''
  let idx = -1

  " do nothing if scheme is unknown to vimwiki
  if !(scheme =~ 'wiki.*' || scheme =~ 'diary' || scheme =~ 'local'
        \ || scheme =~ 'file')
    return [idx, scheme, path, subdir, lnk, ext, scheme.':'.lnk]
  endif

  " scheme behaviors
  if scheme =~ 'wiki\d\+'
    let idx = eval(matchstr(scheme, '\D\+\zs\d\+\ze'))
    if idx < 0 || idx >= len(g:vimwiki_list)
      echom 'Vimwiki Error: Numbered scheme refers to a non-existent wiki!'
      return [idx,'','','','','','']
    else
      if idx != g:vimwiki_current_idx
        call vimwiki#base#validate_wiki_options(idx)
      endif
    endif

    if a:as_html
      if idx == g:vimwiki_current_idx
        let path = VimwikiGet('path_html')
      else
        let path = VimwikiGet('path_html', idx)
      endif
    else
      if idx == g:vimwiki_current_idx
        let path = VimwikiGet('path')
      else
        let path = VimwikiGet('path', idx)
      endif
    endif

    " For Issue 310. Otherwise current subdir is used for another wiki.
    if idx == g:vimwiki_current_idx
      let subdir = VimwikiGet('subdir')
    else
      let subdir = ""
    endif

    if a:as_html
      let ext = '.html'
    else
      if idx == g:vimwiki_current_idx
        let ext = VimwikiGet('ext')
      else
        let ext = VimwikiGet('ext', idx)
      endif
    endif

    " default link for directories
    if vimwiki#u#is_link_to_dir(lnk)
      let ext = (g:vimwiki_dir_link != '' ? g:vimwiki_dir_link. ext : '')
    endif
  elseif scheme =~ 'diary'
    if a:as_html
      " use cached value (save time when converting diary index!)
      let path = VimwikiGet('invsubdir')
      let ext = '.html'
    else
      let path = VimwikiGet('path')
      let ext = VimwikiGet('ext')
    endif
    let subdir = VimwikiGet('diary_rel_path')
  elseif scheme =~ 'local'
    " revisiting the 'lcd'-bug ...
    let path = VimwikiGet('path')
    let subdir = VimwikiGet('subdir')
    if a:as_html
      " prepend browser-specific file: scheme
      let path = 'file://'.fnamemodify(path, ":p")
    endif
  elseif scheme =~ 'file'
    " RM repeated leading "/"'s within a link
    let lnk = substitute(lnk, '^/*', '/', '')
    " convert "/~..." into "~..." for fnamemodify
    let lnk = substitute(lnk, '^/\~', '\~', '')
    " convert /C: to C: (or fnamemodify(...":p:h") interpret it as C:\C:
    if vimwiki#u#is_windows()
      let lnk = substitute(lnk, '^/\ze[[:alpha:]]:', '', '')
    endif
    if a:as_html
      " prepend browser-specific file: scheme
      let path = 'file://'.fnamemodify(lnk, ":p:h").'/'
    else
      let path = fnamemodify(lnk, ":p:h").'/'
    endif
    let lnk = fnamemodify(lnk, ":p:t")
    let subdir = ''
  endif


  " construct url from parts
  if is_schemeless && a:as_html
    let scheme = ''
    let url = lnk.ext
  else
    let url = path.subdir.lnk.ext
  endif

  " result
  return [idx, scheme, path, subdir, lnk, ext, url]
endfunction "}}}

" vimwiki#base#system_open_link
function! vimwiki#base#system_open_link(url) "{{{
  " handlers
  function! s:win32_handler(url)
    "http://vim.wikia.com/wiki/Opening_current_Vim_file_in_your_Windows_browser
    execute 'silent ! start "Title" /B ' . shellescape(a:url, 1)
  endfunction
  function! s:macunix_handler(url)
    execute '!open ' . shellescape(a:url, 1)
  endfunction
  function! s:linux_handler(url)
    call system('xdg-open ' . shellescape(a:url, 1).' &')
  endfunction
  let success = 0
  try
    if vimwiki#u#is_windows()
      call s:win32_handler(a:url)
      return
    elseif has("macunix")
      call s:macunix_handler(a:url)
      return
    else
      call s:linux_handler(a:url)
      return
    endif
  endtry
  echomsg 'Default Vimwiki link handler was unable to open the HTML file!'
endfunction "}}}

" vimwiki#base#open_link
function! vimwiki#base#open_link(cmd, link, ...) "{{{
  let [idx, scheme, path, subdir, lnk, ext, url] =
        \ vimwiki#base#resolve_scheme(a:link, 0)

  if url == ''
    if g:vimwiki_debug
      echom 'open_link: idx='.idx.', scheme='.scheme.', path='.path.', subdir='.subdir.', lnk='.lnk.', ext='.ext.', url='.url
    endif
    echom 'Vimwiki Error: Unable to resolve link!'
    return
  endif

  let update_prev_link = (
        \ scheme == '' ||
        \ scheme =~ 'wiki' ||
        \ scheme =~ 'diary' ? 1 : 0)

  let use_system_open = (
        \ scheme == '' ||
        \ scheme =~ 'wiki' ||
        \ scheme =~ 'diary' ? 0 : 1)

  let vimwiki_prev_link = []
  " update previous link for wiki pages
  if update_prev_link
    if a:0
      let vimwiki_prev_link = [a:1, []]
    elseif &ft == 'vimwiki'
      let vimwiki_prev_link = [expand('%:p'), getpos('.')]
    endif
  endif

  " open/edit
  if g:vimwiki_debug
    echom 'open_link: idx='.idx.', scheme='.scheme.', path='.path.', subdir='.subdir.', lnk='.lnk.', ext='.ext.', url='.url
  endif

  if use_system_open
    call vimwiki#base#system_open_link(url)
  else
    call vimwiki#base#edit_file(a:cmd, url,
          \ vimwiki_prev_link, update_prev_link)
    if idx != g:vimwiki_current_idx
      " this call to setup_buffer_state may not be necessary
      call vimwiki#base#setup_buffer_state(idx)
    endif
  endif
endfunction " }}}

" vimwiki#base#generate_links
function! vimwiki#base#generate_links() "{{{only get links from the current dir
  " change to the directory of the current file
  let orig_pwd = getcwd()
  lcd! %:h
  " all path are relative to the current file's location
  let globlinks = glob('*'.VimwikiGet('ext'),1)."\n"
  " remove extensions
  let globlinks = substitute(globlinks, '\'.VimwikiGet('ext').'\ze\n', '', 'g')
  " restore the original working directory
  exe 'lcd! '.orig_pwd

  " We don't want link to itself. XXX Why ???
  " let cur_link = expand('%:t:r')
  " call filter(links, 'v:val != cur_link')
  let links = split(globlinks,"\n")
  call append(line('$'), substitute(g:vimwiki_rxH1_Template, '__Header__', 'Generated Links', ''))

  call sort(links)

  let bullet = repeat(' ', vimwiki#lst#get_list_margin()).
        \ vimwiki#lst#default_symbol().' '
  for link in links
    call append(line('$'), bullet.
          \ substitute(g:vimwiki_WikiLinkTemplate1, '__LinkUrl__', '\='."'".link."'", ''))
  endfor
endfunction " }}}

" vimwiki#base#goto
function! vimwiki#base#goto(key) "{{{
    call vimwiki#base#edit_file(':e',
          \ VimwikiGet('path').
          \ a:key.
          \ VimwikiGet('ext'))
endfunction "}}}

" vimwiki#base#backlinks
function! vimwiki#base#backlinks() "{{{
    execute 'lvimgrep "\%(^\|[[:blank:][:punct:]]\)'.
          \ expand("%:t:r").
          \ '\([[:blank:][:punct:]]\|$\)\C" '.
          \ escape(VimwikiGet('path').'**/*'.VimwikiGet('ext'), ' ')
endfunction "}}}

" vimwiki#base#get_links
function! vimwiki#base#get_links(pat) "{{{ return string-list for files
  " in the current wiki matching the pattern "pat"
  " search all wiki files (or directories) in wiki 'path' and its subdirs.

  let time1 = reltime()  " start the clock

  " XXX:
  " if maxhi = 1 and <leader>w<leader>w before loading any vimwiki file
  " cached 'subdir' is not set up
  try
    let subdir = VimwikiGet('subdir')
    " FIXED: was previously converting './' to '../'
    let invsubdir = VimwikiGet('invsubdir')
  catch
    let subdir = ''
    let invsubdir = ''
  endtry

  " if current wiki is temporary -- was added by an arbitrary wiki file then do
  " not search wiki files in subdirectories. Or it would hang the system if
  " wiki file was created in $HOME or C:/ dirs.
  if VimwikiGet('temp')
    let search_dirs = ''
  else
    let search_dirs = '**/'
  endif
  " let globlinks = "\n".glob(VimwikiGet('path').search_dirs.a:pat,1)."\n"

  "save pwd, do lcd %:h, restore old pwd; getcwd()
  " change to the directory of the current file
  let orig_pwd = getcwd()

  " calling from other than vimwiki file
  let path_base = vimwiki#u#path_norm(vimwiki#u#chomp_slash(VimwikiGet('path')))
  let path_file = vimwiki#u#path_norm(vimwiki#u#chomp_slash(expand('%:p:h')))

  if vimwiki#u#path_common_pfx(path_file, path_base) != path_base
    exe 'lcd! '.path_base
  else
    lcd! %:p:h
  endif

  " all path are relative to the current file's location
  let globlinks = "\n".glob(invsubdir.search_dirs.a:pat,1)."\n"
  " remove extensions
  let globlinks = substitute(globlinks,'\'.VimwikiGet('ext').'\ze\n', '', 'g')
  " standardize path separators on Windows
  let globlinks = substitute(globlinks,'\\', '/', 'g')

  " shortening those paths ../../dir1/dir2/ that can be shortened
  " first for the current directory, then for parent etc.
  let sp_rx = '\n\zs' . invsubdir . subdir . '\ze'
  for i in range(len(invsubdir)/3)   "XXX multibyte?
    let globlinks = substitute(globlinks, sp_rx, '', 'g')
    let sp_rx = substitute(sp_rx,'\\zs../','../\\zs','')
    let sp_rx = substitute(sp_rx,'[^/]\+/\\ze','\\ze','')
  endfor
  " for directories: add ./ (instead of now empty) and invsubdir (if distinct)
  if a:pat == '*/'
    let globlinks = substitute(globlinks, "\n\n", "\n./\n",'')
    if invsubdir != ''
      let globlinks .= invsubdir."\n"
    else
      let globlinks .= "./\n"
    endif
  endif

  " restore the original working directory
  exe 'lcd! '.orig_pwd

  let time2 = vimwiki#u#time(time1)
  call VimwikiLog_extend('timing',['base:afterglob('.len(split(globlinks, '\n')).')',time2])
  return globlinks
endfunction "}}}

" vimwiki#base#edit_file
function! vimwiki#base#edit_file(command, filename, ...) "{{{
  " XXX: Should we allow * in filenames!?
  " Maxim: It is allowed, escaping here is for vim to be able to open files
  " which have that symbols.
  " Try to remove * from escaping and open&save :
  " [[testBLAfile]]...
  " then
  " [[test*file]]...
  " you'll have E77: Too many file names
  let fname = escape(a:filename, '% *|#')
  let dir = fnamemodify(a:filename, ":p:h")
  if vimwiki#base#mkdir(dir, 1)
    execute a:command.' '.fname
  else
    echom ' '
    echom 'Vimwiki: Unable to edit file in non-existent directory: '.dir
  endif

  " save previous link
  " a:1 -- previous vimwiki link to save
  " a:2 -- should we update previous link
  if a:0 && a:2 && len(a:1) > 0
    let b:vimwiki_prev_link = a:1
  endif
endfunction " }}}

" vimwiki#base#search_word
function! vimwiki#base#search_word(wikiRx, cmd) "{{{
  let match_line = search(a:wikiRx, 's'.a:cmd)
  if match_line == 0
    echomsg 'vimwiki: Wiki link not found.'
  endif
endfunction " }}}

" vimwiki#base#matchstr_at_cursor
" Returns part of the line that matches wikiRX at cursor
function! vimwiki#base#matchstr_at_cursor(wikiRX) "{{{
  let col = col('.') - 1
  let line = getline('.')
  let ebeg = -1
  let cont = match(line, a:wikiRX, 0)
  while (ebeg >= 0 || (0 <= cont) && (cont <= col))
    let contn = matchend(line, a:wikiRX, cont)
    if (cont <= col) && (col < contn)
      let ebeg = match(line, a:wikiRX, cont)
      let elen = contn - ebeg
      break
    else
      let cont = match(line, a:wikiRX, contn)
    endif
  endwh
  if ebeg >= 0
    return strpart(line, ebeg, elen)
  else
    return ""
  endif
endf "}}}

" vimwiki#base#replacestr_at_cursor
function! vimwiki#base#replacestr_at_cursor(wikiRX, sub) "{{{
  let col = col('.') - 1
  let line = getline('.')
  let ebeg = -1
  let cont = match(line, a:wikiRX, 0)
  while (ebeg >= 0 || (0 <= cont) && (cont <= col))
    let contn = matchend(line, a:wikiRX, cont)
    if (cont <= col) && (col < contn)
      let ebeg = match(line, a:wikiRX, cont)
      let elen = contn - ebeg
      break
    else
      let cont = match(line, a:wikiRX, contn)
    endif
  endwh
  if ebeg >= 0
    " TODO: There might be problems with Unicode chars...
    let newline = strpart(line, 0, ebeg).a:sub.strpart(line, ebeg+elen)
    call setline(line('.'), newline)
  endif
endf "}}}

" s:print_wiki_list
function! s:print_wiki_list() "{{{
  let idx = 0
  while idx < len(g:vimwiki_list)
    if idx == g:vimwiki_current_idx
      let sep = ' * '
      echohl PmenuSel
    else
      let sep = '   '
      echohl None
    endif
    echo (idx + 1).sep.VimwikiGet('path', idx)
    let idx += 1
  endwhile
  echohl None
endfunction " }}}

" s:update_wiki_link
function! s:update_wiki_link(fname, old, new) " {{{
  echo "Updating links in ".a:fname
  let has_updates = 0
  let dest = []
  for line in readfile(a:fname)
    if !has_updates && match(line, a:old) != -1
      let has_updates = 1
    endif
    " XXX: any other characters to escape!?
    call add(dest, substitute(line, a:old, escape(a:new, "&"), "g"))
  endfor
  " add exception handling...
  if has_updates
    call rename(a:fname, a:fname.'#vimwiki_upd#')
    call writefile(dest, a:fname)
    call delete(a:fname.'#vimwiki_upd#')
  endif
endfunction " }}}

" s:update_wiki_links_dir
function! s:update_wiki_links_dir(dir, old_fname, new_fname) " {{{
  let old_fname = substitute(a:old_fname, '[/\\]', '[/\\\\]', 'g')
  let new_fname = a:new_fname
  let old_fname_r = old_fname
  let new_fname_r = new_fname

  let old_fname_r = vimwiki#base#apply_template(g:vimwiki_WikiLinkTemplate1,
          \ '\zs'.old_fname.'\ze', '.*', '').
        \ '\|'. vimwiki#base#apply_template(g:vimwiki_WikiLinkTemplate2,
          \ '\zs'.old_fname.'\ze', '.*', '')

  let files = split(glob(VimwikiGet('path').a:dir.'*'.VimwikiGet('ext')), '\n')
  for fname in files
    call s:update_wiki_link(fname, old_fname_r, new_fname_r)
  endfor
endfunction " }}}

" s:tail_name
function! s:tail_name(fname) "{{{
  let result = substitute(a:fname, ":", "__colon__", "g")
  let result = fnamemodify(result, ":t:r")
  let result = substitute(result, "__colon__", ":", "g")
  return result
endfunction "}}}

" s:update_wiki_links
function! s:update_wiki_links(old_fname, new_fname) " {{{
  let old_fname = s:tail_name(a:old_fname)
  let new_fname = s:tail_name(a:new_fname)

  let subdirs = split(a:old_fname, '[/\\]')[: -2]

  " TODO: Use Dictionary here...
  let dirs_keys = ['']
  let dirs_vals = ['']
  if len(subdirs) > 0
    let dirs_keys = ['']
    let dirs_vals = [join(subdirs, '/').'/']
    let idx = 0
    while idx < len(subdirs) - 1
      call add(dirs_keys, join(subdirs[: idx], '/').'/')
      call add(dirs_vals, join(subdirs[idx+1 :], '/').'/')
      let idx = idx + 1
    endwhile
    call add(dirs_keys,join(subdirs, '/').'/')
    call add(dirs_vals, '')
  endif

  let idx = 0
  while idx < len(dirs_keys)
    let dir = dirs_keys[idx]
    let new_dir = dirs_vals[idx]
    call s:update_wiki_links_dir(dir,
          \ new_dir.old_fname, new_dir.new_fname)
    let idx = idx + 1
  endwhile
endfunction " }}}

" s:get_wiki_buffers
function! s:get_wiki_buffers() "{{{
  let blist = []
  let bcount = 1
  while bcount<=bufnr("$")
    if bufexists(bcount)
      let bname = fnamemodify(bufname(bcount), ":p")
      if bname =~ VimwikiGet('ext')."$"
        let bitem = [bname, getbufvar(bname, "vimwiki_prev_link")]
        call add(blist, bitem)
      endif
    endif
    let bcount = bcount + 1
  endwhile
  return blist
endfunction " }}}

" s:open_wiki_buffer
function! s:open_wiki_buffer(item) "{{{
  call vimwiki#base#edit_file(':e', a:item[0])
  if !empty(a:item[1])
    call setbufvar(a:item[0], "vimwiki_prev_link", a:item[1])
  endif
endfunction " }}}

" vimwiki#base#nested_syntax
function! vimwiki#base#nested_syntax(filetype, start, end, textSnipHl) abort "{{{
" From http://vim.wikia.com/wiki/VimTip857
  let ft=toupper(a:filetype)
  let group='textGroup'.ft
  if exists('b:current_syntax')
    let s:current_syntax=b:current_syntax
    " Remove current syntax definition, as some syntax files (e.g. cpp.vim)
    " do nothing if b:current_syntax is defined.
    unlet b:current_syntax
  endif

  " Some syntax files set up iskeyword which might scratch vimwiki a bit.
  " Let us save and restore it later.
  " let b:skip_set_iskeyword = 1
  let is_keyword = &iskeyword

  try
    " keep going even if syntax file is not found
    execute 'syntax include @'.group.' syntax/'.a:filetype.'.vim'
    execute 'syntax include @'.group.' after/syntax/'.a:filetype.'.vim'
  catch
  endtry

  let &iskeyword = is_keyword

  if exists('s:current_syntax')
    let b:current_syntax=s:current_syntax
  else
    unlet b:current_syntax
  endif
  execute 'syntax region textSnip'.ft.
        \ ' matchgroup='.a:textSnipHl.
        \ ' start="'.a:start.'" end="'.a:end.'"'.
        \ ' contains=@'.group.' keepend'

  " A workaround to Issue 115: Nested Perl syntax highlighting differs from
  " regular one.
  " Perl syntax file has perlFunctionName which is usually has no effect due to
  " 'contained' flag. Now we have 'syntax include' that makes all the groups
  " included as 'contained' into specific group.
  " Here perlFunctionName (with quite an angry regexp "\h\w*[^:]") clashes with
  " the rest syntax rules as now it has effect being really 'contained'.
  " Clear it!
  if ft =~ 'perl'
    syntax clear perlFunctionName
  endif
endfunction "}}}

" }}}

" WIKI link following functions {{{
" vimwiki#base#find_next_link
function! vimwiki#base#find_next_link() "{{{
  call vimwiki#base#search_word(g:vimwiki_rxAnyLink, '')
endfunction " }}}

" vimwiki#base#find_prev_link
function! vimwiki#base#find_prev_link() "{{{
  call vimwiki#base#search_word(g:vimwiki_rxAnyLink, 'b')
endfunction " }}}

" vimwiki#base#follow_link
function! vimwiki#base#follow_link(split, ...) "{{{ Parse link at cursor and pass
  " to VimwikiLinkHandler, or failing that, the default open_link handler
  if exists('*vimwiki#'.VimwikiGet('syntax').'_base#follow_link')
    " Syntax-specific links
    " XXX: @Stuart: do we still need it?
    " XXX: @Maxim: most likely!  I am still working on a seemless way to
    " integrate regexp's without complicating syntax/vimwiki.vim
    if a:0
      call vimwiki#{VimwikiGet('syntax')}_base#follow_link(a:split, a:1)
    else
      call vimwiki#{VimwikiGet('syntax')}_base#follow_link(a:split)
    endif
  else
    if a:split == "split"
      let cmd = ":split "
    elseif a:split == "vsplit"
      let cmd = ":vsplit "
    elseif a:split == "tabnew"
      let cmd = ":tabnew "
    else
      let cmd = ":e "
    endif

    " try WikiLink
    let lnk = matchstr(vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWikiLink),
          \ g:vimwiki_rxWikiLinkMatchUrl)
    " try WikiIncl
    if lnk == ""
      let lnk = matchstr(vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWikiIncl),
          \ g:vimwiki_rxWikiInclMatchUrl)
    endif
    " try Weblink
    if lnk == ""
      let lnk = matchstr(vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWeblink),
            \ g:vimwiki_rxWeblinkMatchUrl)
    endif

    if lnk != ""
      if !VimwikiLinkHandler(lnk)
        call vimwiki#base#open_link(cmd, lnk)
      endif
      return
    endif

    if a:0 > 0
      execute "normal! ".a:1
    else
      call vimwiki#base#normalize_link(0)
    endif
  endif

endfunction " }}}

" vimwiki#base#go_back_link
function! vimwiki#base#go_back_link() "{{{
  if exists("b:vimwiki_prev_link")
    " go back to saved wiki link
    let prev_word = b:vimwiki_prev_link
    execute ":e ".substitute(prev_word[0], '\s', '\\\0', 'g')
    call setpos('.', prev_word[1])
  endif
endfunction " }}}

" vimwiki#base#goto_index
function! vimwiki#base#goto_index(wnum, ...) "{{{
  if a:wnum > len(g:vimwiki_list)
    echom "vimwiki: Wiki ".a:wnum." is not registered in g:vimwiki_list!"
    return
  endif

  " usually a:wnum is greater then 0 but with the following command it is == 0:
  " vim -n -c "exe 'VimwikiIndex' | echo g:vimwiki_current_idx"
  if a:wnum > 0
    let idx = a:wnum - 1
  else
    let idx = 0
  endif

  if a:0
    let cmd = 'tabedit'
  else
    let cmd = 'edit'
  endif

  if g:vimwiki_debug == 3
    echom "--- Goto_index g:curr_idx=".g:vimwiki_current_idx." ww_idx=".idx.""
  endif

  call vimwiki#base#validate_wiki_options(idx)
  call vimwiki#base#edit_file(cmd,
        \ VimwikiGet('path', idx).VimwikiGet('index', idx).
        \ VimwikiGet('ext', idx))
  call vimwiki#base#setup_buffer_state(idx)
endfunction "}}}

" vimwiki#base#delete_link
function! vimwiki#base#delete_link() "{{{
  "" file system funcs
  "" Delete wiki link you are in from filesystem
  let val = input('Delete ['.expand('%').'] (y/n)? ', "")
  if val != 'y'
    return
  endif
  let fname = expand('%:p')
  try
    call delete(fname)
  catch /.*/
    echomsg 'vimwiki: Cannot delete "'.expand('%:t:r').'"!'
    return
  endtry

  call vimwiki#base#go_back_link()
  execute "bdelete! ".escape(fname, " ")

  " reread buffer => deleted wiki link should appear as non-existent
  if expand('%:p') != ""
    execute "e"
  endif
endfunction "}}}

" vimwiki#base#rename_link
function! vimwiki#base#rename_link() "{{{
  "" Rename wiki link, update all links to renamed WikiWord
  let subdir = VimwikiGet('subdir')
  let old_fname = subdir.expand('%:t')

  " there is no file (new one maybe)
  if glob(expand('%:p')) == ''
    echomsg 'vimwiki: Cannot rename "'.expand('%:p').
          \'". It does not exist! (New file? Save it before renaming.)'
    return
  endif

  let val = input('Rename "'.expand('%:t:r').'" (y/n)? ', "")
  if val!='y'
    return
  endif

  let new_link = input('Enter new name: ', "")

  if new_link =~ '[/\\]'
    " It is actually doable but I do not have free time to do it.
    echomsg 'vimwiki: Cannot rename to a filename with path!'
    return
  endif

  " check new_fname - it should be 'good', not empty
  if substitute(new_link, '\s', '', 'g') == ''
    echomsg 'vimwiki: Cannot rename to an empty filename!'
    return
  endif

  let url = matchstr(new_link, g:vimwiki_rxWikiLinkMatchUrl)
  if url != ''
    let new_link = url
  endif

  let new_link = subdir.new_link
  let new_fname = VimwikiGet('path').new_link.VimwikiGet('ext')

  " do not rename if file with such name exists
  let fname = glob(new_fname)
  if fname != ''
    echomsg 'vimwiki: Cannot rename to "'.new_fname.
          \ '". File with that name exist!'
    return
  endif
  " rename wiki link file
  try
    echomsg "Renaming ".VimwikiGet('path').old_fname." to ".new_fname
    let res = rename(expand('%:p'), expand(new_fname))
    if res != 0
      throw "Cannot rename!"
    end
  catch /.*/
    echomsg 'vimwiki: Cannot rename "'.expand('%:t:r').'" to "'.new_fname.'"'
    return
  endtry

  let &buftype="nofile"

  let cur_buffer = [expand('%:p'),
        \getbufvar(expand('%:p'), "vimwiki_prev_link")]

  let blist = s:get_wiki_buffers()

  " save wiki buffers
  for bitem in blist
    execute ':b '.escape(bitem[0], ' ')
    execute ':update'
  endfor

  execute ':b '.escape(cur_buffer[0], ' ')

  " remove wiki buffers
  for bitem in blist
    execute 'bwipeout '.escape(bitem[0], ' ')
  endfor

  let setting_more = &more
  setlocal nomore

  " update links
  call s:update_wiki_links(old_fname, new_link)

  " restore wiki buffers
  for bitem in blist
    if bitem[0] != cur_buffer[0]
      call s:open_wiki_buffer(bitem)
    endif
  endfor

  call s:open_wiki_buffer([new_fname,
        \ cur_buffer[1]])
  " execute 'bwipeout '.escape(cur_buffer[0], ' ')

  echomsg old_fname." is renamed to ".new_fname

  let &more = setting_more
endfunction " }}}

" vimwiki#base#ui_select
function! vimwiki#base#ui_select() "{{{
  call s:print_wiki_list()
  let idx = input("Select Wiki (specify number): ")
  if idx == ""
    return
  endif
  call vimwiki#base#goto_index(idx)
endfunction "}}}
" }}}

" TEXT OBJECTS functions {{{

" vimwiki#base#TO_header
function! vimwiki#base#TO_header(inner, visual) "{{{
  if !search('^\(=\+\).\+\1\s*$', 'bcW')
    return
  endif

  let sel_start = line("'<")
  let sel_end = line("'>")
  let block_start = line(".")
  let advance = 0

  let level = vimwiki#u#count_first_sym(getline('.'))

  let is_header_selected = sel_start == block_start
        \ && sel_start != sel_end

  if a:visual && is_header_selected
    if level > 1
      let level -= 1
      call search('^\(=\{'.level.'\}\).\+\1\s*$', 'bcW')
    else
      let advance = 1
    endif
  endif

  normal! V

  if a:visual && is_header_selected
    call cursor(sel_end + advance, 0)
  endif

  if search('^\(=\{1,'.level.'}\).\+\1\s*$', 'W')
    call cursor(line('.') - 1, 0)
  else
    call cursor(line('$'), 0)
  endif

  if a:inner && getline(line('.')) =~ '^\s*$'
    let lnum = prevnonblank(line('.') - 1)
    call cursor(lnum, 0)
  endif
endfunction "}}}

" vimwiki#base#TO_table_cell
function! vimwiki#base#TO_table_cell(inner, visual) "{{{
  if col('.') == col('$')-1
    return
  endif

  if a:visual
    normal! `>
    let sel_end = getpos('.')
    normal! `<
    let sel_start = getpos('.')

    let firsttime = sel_start == sel_end

    if firsttime
      if !search('|\|\(-+-\)', 'cb', line('.'))
        return
      endif
      if getline('.')[virtcol('.')] == '+'
        normal! l
      endif
      if a:inner
        normal! 2l
      endif
      let sel_start = getpos('.')
    endif

    normal! `>
    call search('|\|\(-+-\)', '', line('.'))
    if getline('.')[virtcol('.')] == '+'
      normal! l
    endif
    if a:inner
      if firsttime || abs(sel_end[2] - getpos('.')[2]) != 2
        normal! 2h
      endif
    endif
    let sel_end = getpos('.')

    call setpos('.', sel_start)
    exe "normal! \<C-v>"
    call setpos('.', sel_end)

    " XXX: WORKAROUND.
    " if blockwise selection is ended at | character then pressing j to extend
    " selection furhter fails. But if we shake the cursor left and right then
    " it works.
    normal! hl
  else
    if !search('|\|\(-+-\)', 'cb', line('.'))
      return
    endif
    if a:inner
      normal! 2l
    endif
    normal! v
    call search('|\|\(-+-\)', '', line('.'))
    if !a:inner && getline('.')[virtcol('.')-1] == '|'
      normal! h
    elseif a:inner
      normal! 2h
    endif
  endif
endfunction "}}}

" vimwiki#base#TO_table_col
function! vimwiki#base#TO_table_col(inner, visual) "{{{
  let t_rows = vimwiki#tbl#get_rows(line('.'))
  if empty(t_rows)
    return
  endif

  " TODO: refactor it!
  if a:visual
    normal! `>
    let sel_end = getpos('.')
    normal! `<
    let sel_start = getpos('.')

    let firsttime = sel_start == sel_end

    if firsttime
      " place cursor to the top row of the table
      call vimwiki#u#cursor(t_rows[0][0], virtcol('.'))
      " do not accept the match at cursor position if cursor is next to column
      " separator of the table separator (^ is a cursor):
      " |-----^-+-------|
      " | bla   | bla   |
      " |-------+-------|
      " or it will select wrong column.
      if strpart(getline('.'), virtcol('.')-1) =~ '^-+'
        let s_flag = 'b'
      else
        let s_flag = 'cb'
      endif
      " search the column separator backwards
      if !search('|\|\(-+-\)', s_flag, line('.'))
        return
      endif
      " -+- column separator is matched --> move cursor to the + sign
      if getline('.')[virtcol('.')] == '+'
        normal! l
      endif
      " inner selection --> reduce selection
      if a:inner
        normal! 2l
      endif
      let sel_start = getpos('.')
    endif

    normal! `>
    if !firsttime && getline('.')[virtcol('.')] == '|'
      normal! l
    elseif a:inner && getline('.')[virtcol('.')+1] =~ '[|+]'
      normal! 2l
    endif
    " search for the next column separator
    call search('|\|\(-+-\)', '', line('.'))
    " Outer selection selects a column without border on the right. So we move
    " our cursor left if the previous search finds | border, not -+-.
    if getline('.')[virtcol('.')] != '+'
      normal! h
    endif
    if a:inner
      " reduce selection a bit more if inner.
      normal! h
    endif
    " expand selection to the bottom line of the table
    call vimwiki#u#cursor(t_rows[-1][0], virtcol('.'))
    let sel_end = getpos('.')

    call setpos('.', sel_start)
    exe "normal! \<C-v>"
    call setpos('.', sel_end)

  else
    " place cursor to the top row of the table
    call vimwiki#u#cursor(t_rows[0][0], virtcol('.'))
    " do not accept the match at cursor position if cursor is next to column
    " separator of the table separator (^ is a cursor):
    " |-----^-+-------|
    " | bla   | bla   |
    " |-------+-------|
    " or it will select wrong column.
    if strpart(getline('.'), virtcol('.')-1) =~ '^-+'
      let s_flag = 'b'
    else
      let s_flag = 'cb'
    endif
    " search the column separator backwards
    if !search('|\|\(-+-\)', s_flag, line('.'))
      return
    endif
    " -+- column separator is matched --> move cursor to the + sign
    if getline('.')[virtcol('.')] == '+'
      normal! l
    endif
    " inner selection --> reduce selection
    if a:inner
      normal! 2l
    endif

    exe "normal! \<C-V>"

    " search for the next column separator
    call search('|\|\(-+-\)', '', line('.'))
    " Outer selection selects a column without border on the right. So we move
    " our cursor left if the previous search finds | border, not -+-.
    if getline('.')[virtcol('.')] != '+'
      normal! h
    endif
    " reduce selection a bit more if inner.
    if a:inner
      normal! h
    endif
    " expand selection to the bottom line of the table
    call vimwiki#u#cursor(t_rows[-1][0], virtcol('.'))
  endif
endfunction "}}}
" }}}

" HEADER functions {{{
" vimwiki#base#AddHeaderLevel
function! vimwiki#base#AddHeaderLevel() "{{{
  let lnum = line('.')
  let line = getline(lnum)
  let rxHdr = g:vimwiki_rxH
  if line =~ '^\s*$'
    return
  endif

  if line =~ g:vimwiki_rxHeader
    let level = vimwiki#u#count_first_sym(line)
    if level < 6
      if g:vimwiki_symH
        let line = substitute(line, '\('.rxHdr.'\+\).\+\1', rxHdr.'&'.rxHdr, '')
      else
        let line = substitute(line, '\('.rxHdr.'\+\).\+', rxHdr.'&', '')
      endif
      call setline(lnum, line)
    endif
  else
    let line = substitute(line, '^\s*', '&'.rxHdr.' ', '')
    if g:vimwiki_symH
      let line = substitute(line, '\s*$', ' '.rxHdr.'&', '')
    endif
    call setline(lnum, line)
  endif
endfunction "}}}

" vimwiki#base#RemoveHeaderLevel
function! vimwiki#base#RemoveHeaderLevel() "{{{
  let lnum = line('.')
  let line = getline(lnum)
  let rxHdr = g:vimwiki_rxH
  if line =~ '^\s*$'
    return
  endif

  if line =~ g:vimwiki_rxHeader
    let level = vimwiki#u#count_first_sym(line)
    let old = repeat(rxHdr, level)
    let new = repeat(rxHdr, level - 1)

    let chomp = line =~ rxHdr.'\s'

    if g:vimwiki_symH
      let line = substitute(line, old, new, 'g')
    else
      let line = substitute(line, old, new, '')
    endif

    if level == 1 && chomp
      let line = substitute(line, '^\s', '', 'g')
      let line = substitute(line, '\s$', '', 'g')
    endif

    let line = substitute(line, '\s*$', '', '')

    call setline(lnum, line)
  endif
endfunction " }}}
"}}}

" LINK functions {{{
" vimwiki#base#apply_template
"   Construct a regular expression matching from template (with special
"   characters properly escaped), by substituting rxUrl for __LinkUrl__, rxDesc
"   for __LinkDescription__, and rxStyle for __LinkStyle__.  The three
"   arguments rxUrl, rxDesc, and rxStyle are copied verbatim, without any
"   special character escapes or substitutions.
function! vimwiki#base#apply_template(template, rxUrl, rxDesc, rxStyle) "{{{
  let magic_chars = '.*[\^$'
  let lnk = escape(a:template, magic_chars)
  if a:rxUrl != ""
    let lnk = substitute(lnk, '__LinkUrl__', '\='."'".a:rxUrl."'", '')
  endif
  if a:rxDesc != ""
    let lnk = substitute(lnk, '__LinkDescription__', '\='."'".a:rxDesc."'", '')
  endif
  if a:rxStyle != ""
    let lnk = substitute(lnk, '__LinkStyle__', '\='."'".a:rxStyle."'", '')
  endif
  return lnk
endfunction " }}}

" s:clean_url
function! s:clean_url(url) " {{{
  let url = split(a:url, '/\|=\|-\|&\|?\|\.')
  let url = filter(url, 'v:val != ""')
  let url = filter(url, 'v:val != "www"')
  let url = filter(url, 'v:val != "com"')
  let url = filter(url, 'v:val != "org"')
  let url = filter(url, 'v:val != "net"')
  let url = filter(url, 'v:val != "edu"')
  let url = filter(url, 'v:val != "http\:"')
  let url = filter(url, 'v:val != "https\:"')
  let url = filter(url, 'v:val != "file\:"')
  let url = filter(url, 'v:val != "xml\:"')
  return join(url, " ")
endfunction " }}}

" vimwiki#base#normalize_link_helper
function! vimwiki#base#normalize_link_helper(str, rxUrl, rxDesc, template) " {{{
  let str = a:str
  let url = matchstr(str, a:rxUrl)
  let descr = matchstr(str, a:rxDesc)
  let template = a:template
  if descr == ""
    let descr = s:clean_url(url)
  endif
  let lnk = substitute(template, '__LinkDescription__', '\="'.descr.'"', '')
  let lnk = substitute(lnk, '__LinkUrl__', '\="'.url.'"', '')
  return lnk
endfunction " }}}

" vimwiki#base#normalize_imagelink_helper
function! vimwiki#base#normalize_imagelink_helper(str, rxUrl, rxDesc, rxStyle, template) "{{{
  let lnk = vimwiki#base#normalize_link_helper(a:str, a:rxUrl, a:rxDesc, a:template)
  let style = matchstr(str, a:rxStyle)
  let lnk = substitute(lnk, '__LinkStyle__', '\="'.style.'"', '')
  return lnk
endfunction " }}}

" s:normalize_link_syntax_n
function! s:normalize_link_syntax_n() " {{{
  let lnum = line('.')

  " try WikiLink
  let lnk = vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWikiLink)
  if !empty(lnk)
    let sub = vimwiki#base#normalize_link_helper(lnk,
          \ g:vimwiki_rxWikiLinkMatchUrl, g:vimwiki_rxWikiLinkMatchDescr,
          \ g:vimwiki_WikiLinkTemplate2)
    call vimwiki#base#replacestr_at_cursor(g:vimwiki_rxWikiLink, sub)
    if g:vimwiki_debug > 1
      echomsg "WikiLink: ".lnk." Sub: ".sub
    endif
    return
  endif

  " try WikiIncl
  let lnk = vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWikiIncl)
  if !empty(lnk)
    " NO-OP !!
    if g:vimwiki_debug > 1
      echomsg "WikiIncl: ".lnk." Sub: ".lnk
    endif
    return
  endif

  " try Word (any characters except separators)
  " rxWord is less permissive than rxWikiLinkUrl which is used in
  " normalize_link_syntax_v
  let lnk = vimwiki#base#matchstr_at_cursor(g:vimwiki_rxWord)
  if !empty(lnk)
    let sub = vimwiki#base#normalize_link_helper(lnk,
          \ g:vimwiki_rxWord, '',
          \ g:vimwiki_WikiLinkTemplate1)
    call vimwiki#base#replacestr_at_cursor('\V'.lnk, sub)
    if g:vimwiki_debug > 1
      echomsg "Word: ".lnk." Sub: ".sub
    endif
    return
  endif

endfunction " }}}

" s:normalize_link_syntax_v
function! s:normalize_link_syntax_v() " {{{
  let lnum = line('.')
  let sel_save = &selection
  let &selection = "old"
  let rv = @"
  let rt = getregtype('"')
  let done = 0

  try
    norm! gvy
    let visual_selection = @"
    let visual_selection = substitute(g:vimwiki_WikiLinkTemplate1, '__LinkUrl__', '\='."'".visual_selection."'", '')

    call setreg('"', visual_selection, 'v')

    " paste result
    norm! `>pgvd

  finally
    call setreg('"', rv, rt)
    let &selection = sel_save
  endtry

endfunction " }}}

" vimwiki#base#normalize_link
function! vimwiki#base#normalize_link(is_visual_mode) "{{{
  if exists('*vimwiki#'.VimwikiGet('syntax').'_base#normalize_link')
    " Syntax-specific links
    call vimwiki#{VimwikiGet('syntax')}_base#normalize_link(a:is_visual_mode)
  else
    if !a:is_visual_mode
      call s:normalize_link_syntax_n()
    elseif visualmode() ==# 'v' && line("'<") == line("'>")
      " action undefined for 'line-wise' or 'multi-line' visual mode selections
      call s:normalize_link_syntax_v()
    endif
  endif
endfunction "}}}

" }}}

" -------------------------------------------------------------------------
" Load syntax-specific Wiki functionality
for syn in vimwiki#base#get_known_syntaxes()
  execute 'runtime! autoload/vimwiki/'.syn.'_base.vim'
endfor
" -------------------------------------------------------------------------


autoload/vimwiki/lst.vim	[[[1
555
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki autoload plugin file
" Todo lists related stuff here.
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

if exists("g:loaded_vimwiki_list_auto") || &cp
  finish
endif
let g:loaded_vimwiki_lst_auto = 1

" Script variables {{{
let s:rx_li_box = '\[.\?\]'
" }}}

" Script functions {{{

" Get unicode string symbol at index
function! s:str_idx(str, idx) "{{{
  " Unfortunatly vimscript cannot get symbol at index in unicode string such as
  " '✗○◐●✓'
  return matchstr(a:str, '\%'.a:idx.'v.')
endfunction "}}}

" Get checkbox regexp
function! s:rx_li_symbol(rate) "{{{
  let result = ''
  if a:rate == 100
    let result = s:str_idx(g:vimwiki_listsyms, 5)
  elseif a:rate == 0
    let result = s:str_idx(g:vimwiki_listsyms, 1)
  elseif a:rate >= 67
    let result = s:str_idx(g:vimwiki_listsyms, 4)
  elseif a:rate >= 34
    let result = s:str_idx(g:vimwiki_listsyms, 3)
  else
    let result = s:str_idx(g:vimwiki_listsyms, 2)
  endif

  return '\['.result.'\]'
endfunction "}}}

" Get blank checkbox
function! s:blank_checkbox() "{{{
  return '['.s:str_idx(g:vimwiki_listsyms, 1).'] '
endfunction "}}}

" Get regexp of the list item.
function! s:rx_list_item() "{{{
  return '\('.g:vimwiki_rxListBullet.'\|'.g:vimwiki_rxListNumber.'\)'
endfunction "}}}

" Get regexp of the list item with checkbox.
function! s:rx_cb_list_item() "{{{
  return s:rx_list_item().'\s*\zs\[.\?\]'
endfunction "}}}

" Get level of the list item.
function! s:get_level(lnum) "{{{
  if VimwikiGet('syntax') == 'media'
    let level = vimwiki#u#count_first_sym(getline(a:lnum))
  else
    let level = indent(a:lnum)
  endif
  return level
endfunction "}}}

" Get previous list item.
" Returns: line number or 0.
function! s:prev_list_item(lnum) "{{{
  let c_lnum = a:lnum - 1
  while c_lnum >= 1
    let line = getline(c_lnum)
    if line =~ s:rx_list_item()
      return c_lnum
    endif
    if line =~ '^\s*$'
      return 0
    endif
    let c_lnum -= 1
  endwhile
  return 0
endfunction "}}}

" Get next list item in the list.
" Returns: line number or 0.
function! s:next_list_item(lnum) "{{{
  let c_lnum = a:lnum + 1
  while c_lnum <= line('$')
    let line = getline(c_lnum)
    if line =~ s:rx_list_item()
      return c_lnum
    endif
    if line =~ '^\s*$'
      return 0
    endif
    let c_lnum += 1
  endwhile
  return 0
endfunction "}}}

" Find next list item in the buffer.
" Returns: line number or 0.
function! s:find_next_list_item(lnum) "{{{
  let c_lnum = a:lnum + 1
  while c_lnum <= line('$')
    let line = getline(c_lnum)
    if line =~ s:rx_list_item()
      return c_lnum
    endif
    let c_lnum += 1
  endwhile
  return 0
endfunction "}}}

" Set state of the list item on line number "lnum" to [ ] or [x]
function! s:set_state(lnum, rate) "{{{
  let line = getline(a:lnum)
  let state = s:rx_li_symbol(a:rate)
  let line = substitute(line, s:rx_li_box, state, '')
  call setline(a:lnum, line)
endfunction "}}}

" Get state of the list item on line number "lnum"
function! s:get_state(lnum) "{{{
  let state = 0
  let line = getline(a:lnum)
  let opt = matchstr(line, s:rx_cb_list_item())
  if opt =~ s:rx_li_symbol(100)
    let state = 100
  elseif opt =~ s:rx_li_symbol(0)
    let state = 0
  elseif opt =~ s:rx_li_symbol(25)
    let state = 25
  elseif opt =~ s:rx_li_symbol(50)
    let state = 50
  elseif opt =~ s:rx_li_symbol(75)
    let state = 75
  endif
  return state
endfunction "}}}

" Returns 1 if there is checkbox on a list item, 0 otherwise.
function! s:is_cb_list_item(lnum) "{{{
  return getline(a:lnum) =~ s:rx_cb_list_item()
endfunction "}}}

" Returns start line number of list item, 0 if it is not a list.
function! s:is_list_item(lnum) "{{{
  let c_lnum = a:lnum
  while c_lnum >= 1
    let line = getline(c_lnum)
    if line =~ s:rx_list_item()
      return c_lnum
    endif
    if line =~ '^\s*$'
      return 0
    endif
    if indent(c_lnum) > indent(a:lnum)
      return 0
    endif
    let c_lnum -= 1
  endwhile
  return 0
endfunction "}}}

" Returns char column of checkbox. Used in parent/child checks.
function! s:get_li_pos(lnum) "{{{
  return stridx(getline(a:lnum), '[')
endfunction "}}}

" Returns list of line numbers of parent and all its child items.
function! s:get_child_items(lnum) "{{{
  let result = []
  let lnum = a:lnum
  let p_pos = s:get_level(lnum)

  " add parent
  call add(result, lnum)

  let lnum = s:next_list_item(lnum)
  while lnum != 0 && s:is_list_item(lnum) && s:get_level(lnum) > p_pos
    call add(result, lnum)
    let lnum = s:next_list_item(lnum)
  endwhile

  return result
endfunction "}}}

" Returns list of line numbers of all items of the same level.
function! s:get_sibling_items(lnum) "{{{
  let result = []
  let lnum = a:lnum
  let ind = s:get_level(lnum)

  while lnum != 0 && s:get_level(lnum) >= ind
    if s:get_level(lnum) == ind && s:is_cb_list_item(lnum)
      call add(result, lnum)
    endif
    let lnum = s:next_list_item(lnum)
  endwhile

  let lnum = s:prev_list_item(a:lnum)
  while lnum != 0 && s:get_level(lnum) >= ind
    if s:get_level(lnum) == ind && s:is_cb_list_item(lnum)
      call add(result, lnum)
    endif
    let lnum = s:prev_list_item(lnum)
  endwhile

  return result
endfunction "}}}

" Returns line number of the parent of lnum item
function! s:get_parent_item(lnum) "{{{
  let lnum = a:lnum
  let ind = s:get_level(lnum)

  let lnum = s:prev_list_item(lnum)
  while lnum != 0 && s:is_list_item(lnum) && s:get_level(lnum) >= ind
    let lnum = s:prev_list_item(lnum)
  endwhile

  if s:is_cb_list_item(lnum)
    return lnum
  else
    return a:lnum
  endif
endfunction "}}}

" Creates checkbox in a list item.
function! s:create_cb_list_item(lnum) "{{{
  let line = getline(a:lnum)
  let m = matchstr(line, s:rx_list_item())
  if m != ''
    let li_content = substitute(strpart(line, len(m)), '^\s*', '', '')
    let line = substitute(m, '\s*$', ' ', '').s:blank_checkbox().li_content
    call setline(a:lnum, line)
  endif
endfunction "}}}

" Tells if all of the sibling list items are checked or not.
function! s:all_siblings_checked(lnum) "{{{
  let result = 0
  let cnt = 0
  let siblings = s:get_sibling_items(a:lnum)
  for lnum in siblings
    let cnt += s:get_state(lnum)
  endfor
  let result = cnt/len(siblings)
  return result
endfunction "}}}

" Creates checkbox on a list item if there is no one.
function! s:TLI_create_checkbox(lnum) "{{{
  if a:lnum && !s:is_cb_list_item(a:lnum)
    if g:vimwiki_auto_checkbox
      call s:create_cb_list_item(a:lnum)
    endif
    return 1
  endif
  return 0
endfunction "}}}

" Switch state of the child list items.
function! s:TLI_switch_child_state(lnum) "{{{
  let current_state = s:get_state(a:lnum)
  if current_state == 100
    let new_state = 0
  else
    let new_state = 100
  endif
  for lnum in s:get_child_items(a:lnum)
    call s:set_state(lnum, new_state)
  endfor
endfunction "}}}

" Switch state of the parent list items.
function! s:TLI_switch_parent_state(lnum) "{{{
  let c_lnum = a:lnum
  while s:is_cb_list_item(c_lnum)
    let parent_lnum = s:get_parent_item(c_lnum)
    if parent_lnum == c_lnum
      break
    endif
    call s:set_state(parent_lnum, s:all_siblings_checked(c_lnum))

    let c_lnum = parent_lnum
  endwhile
endfunction "}}}

function! s:TLI_toggle(lnum) "{{{
  if !s:TLI_create_checkbox(a:lnum)
    call s:TLI_switch_child_state(a:lnum)
  endif
  call s:TLI_switch_parent_state(a:lnum)
endfunction "}}}

" Script functions }}}

" Toggle list item between [ ] and [X]
function! vimwiki#lst#ToggleListItem(line1, line2) "{{{
  let line1 = a:line1
  let line2 = a:line2

  if line1 != line2 && !s:is_list_item(line1)
    let line1 = s:find_next_list_item(line1)
  endif

  let c_lnum = line1
  while c_lnum != 0 && c_lnum <= line2
    let li_lnum = s:is_list_item(c_lnum)

    if li_lnum
      let li_level = s:get_level(li_lnum)
      if c_lnum == line1
        let start_li_level = li_level
      endif

      if li_level <= start_li_level
        call s:TLI_toggle(li_lnum)
        let start_li_level = li_level
      endif
    endif

    let c_lnum = s:find_next_list_item(c_lnum)
  endwhile

endfunction "}}}

function! vimwiki#lst#kbd_cr() "{{{
  " This function is heavily relies on proper 'set comments' option.
  let cr = "\<CR>"
  if getline('.') =~ s:rx_cb_list_item()
    let cr .= s:blank_checkbox()
  endif
  return cr
endfunction "}}}

function! vimwiki#lst#kbd_oO(cmd) "{{{
  " cmd should be 'o' or 'O'

  let l:count = v:count1
  while l:count > 0

    let beg_lnum = foldclosed('.')
    let end_lnum = foldclosedend('.')
    if end_lnum != -1 && a:cmd ==# 'o'
      let lnum = end_lnum
      let line = getline(beg_lnum)
    else
      let line = getline('.')
      let lnum = line('.')
    endif

    let m = matchstr(line, s:rx_list_item())
    let res = ''
    if line =~ s:rx_cb_list_item()
      let res = substitute(m, '\s*$', ' ', '').s:blank_checkbox()
    elseif line =~ s:rx_list_item()
      let res = substitute(m, '\s*$', ' ', '')
    elseif &autoindent || &smartindent
      let res = matchstr(line, '^\s*')
    endif

    if a:cmd ==# 'o'
      call append(lnum, res)
      call cursor(lnum + 1, col('$'))
    else
      call append(lnum - 1, res)
      call cursor(lnum, col('$'))
    endif

    let l:count -= 1
  endwhile

  startinsert!

endfunction "}}}

function! vimwiki#lst#default_symbol() "{{{
  " TODO: initialize default symbol from syntax/vimwiki_xxx.vim
  if VimwikiGet('syntax') == 'default'
    return '-'
  else
    return '*'
  endif
endfunction "}}}

function vimwiki#lst#get_list_margin() "{{{
  if VimwikiGet('list_margin') < 0
    return &sw
  else
    return VimwikiGet('list_margin')
  endif
endfunction "}}}

function s:get_list_sw() "{{{
  if VimwikiGet('syntax') == 'media'
    return 1
  else
    return &sw
  endif
endfunction  "}}}

function s:get_list_nesting_level(lnum) "{{{
  if VimwikiGet('syntax') == 'media'
    if getline(a:lnum) !~ s:rx_list_item()
      let level = 0
    else
      let level = vimwiki#u#count_first_sym(getline(a:lnum)) - 1
      let level = level < 0 ? 0 : level
    endif
  else
    let level = indent(a:lnum)
  endif
  return level
endfunction  "}}}

function s:get_list_indent(lnum) "{{{
  if VimwikiGet('syntax') == 'media'
    return indent(a:lnum)
  else
    return 0
  endif
endfunction  "}}}

function! s:compose_list_item(n_indent, n_nesting, sym_nest, sym_bullet, li_content, ...) "{{{
  if a:0
    let sep = a:1
  else
    let sep = ''
  endif
  let li_indent = repeat(' ', max([0,a:n_indent])).sep
  let li_nesting = repeat(a:sym_nest, max([0,a:n_nesting])).sep
  if len(a:sym_bullet) > 0
    let li_bullet = a:sym_bullet.' '.sep
  else
    let li_bullet = ''.sep
  endif
  return li_indent.li_nesting.li_bullet.a:li_content
endfunction "}}}

function s:compose_cb_bullet(prev_cb_bullet, sym) "{{{
  return a:sym.matchstr(a:prev_cb_bullet, '\S*\zs\s\+.*')
endfunction "}}}

function! vimwiki#lst#change_level(...) "{{{
  let default_sym = vimwiki#lst#default_symbol()
  let cmd = '>>'
  let sym = default_sym

  " parse argument
  if a:0
    if a:1 != '<<' && a:1 != '>>'
      let cmd = '--'
      let sym = a:1
    else
      let cmd = a:1
    endif
  endif
  " is symbol valid
  if sym.' ' !~ s:rx_cb_list_item() && sym.' ' !~ s:rx_list_item()
    return
  endif

  " parsing setup
  let lnum = line('.')
  let line = getline('.')

  let list_margin = vimwiki#lst#get_list_margin()
  let list_sw = s:get_list_sw()
  let n_nesting = s:get_list_nesting_level(lnum)
  let n_indent = s:get_list_indent(lnum)

  " remove indent and nesting
  let li_bullet_and_content = strpart(line, n_nesting + n_indent)

  " list bullet and checkbox
  let cb_bullet = matchstr(li_bullet_and_content, s:rx_list_item()).
        \ matchstr(li_bullet_and_content, s:rx_cb_list_item())

  " XXX: it could be not unicode proof --> if checkboxes are set up with unicode syms
  " content
  let li_content = strpart(li_bullet_and_content, len(cb_bullet))

  " trim
  let cb_bullet = vimwiki#u#trim(cb_bullet)
  let li_content = vimwiki#u#trim(li_content)

  " nesting symbol
  if VimwikiGet('syntax') == 'media'
    if len(cb_bullet) > 0
      let sym_nest = cb_bullet[0]
    else
      let sym_nest = sym
    endif
  else
    let sym_nest = ' '
  endif

  if g:vimwiki_debug
    echomsg "PARSE: Sw [".list_sw."]"
    echomsg s:compose_list_item(n_indent, n_nesting, sym_nest, cb_bullet, li_content, '|')
  endif

  " change level
  if cmd == '--'
    let cb_bullet = s:compose_cb_bullet(cb_bullet, sym)
    if VimwikiGet('syntax') == 'media'
      let sym_nest = sym
    endif
  elseif cmd == '>>'
    if cb_bullet == ''
      let cb_bullet = sym
    else
      let n_nesting = n_nesting + list_sw
    endif
  elseif cmd == '<<'
    let n_nesting = n_nesting - list_sw
    if VimwikiGet('syntax') == 'media'
      if n_nesting < 0
        let cb_bullet = ''
      endif
    else
      if n_nesting < list_margin
        let cb_bullet = ''
      endif
    endif
  endif

  let n_nesting = max([0, n_nesting])

  if g:vimwiki_debug
    echomsg "SHIFT:"
    echomsg s:compose_list_item(n_indent, n_nesting, sym_nest, cb_bullet, li_content, '|')
  endif

  " XXX: this is the code that adds the initial indent
  let add_nesting = VimwikiGet('syntax') != 'media'
  if n_indent + n_nesting*(add_nesting) < list_margin
    let n_indent = list_margin - n_nesting*(add_nesting)
  endif

  if g:vimwiki_debug
    echomsg "INDENT:"
    echomsg s:compose_list_item(n_indent, n_nesting, sym_nest, cb_bullet, li_content, '|')
  endif

  let line = s:compose_list_item(n_indent, n_nesting, sym_nest, cb_bullet, li_content)

  " replace
  call setline(lnum, line)
  call cursor(lnum, match(line, '\S') + 1)
endfunction "}}}
ftplugin/vimwiki.vim	[[[1
544
" vim:tabstop=2:shiftwidth=2:expandtab:foldmethod=marker:textwidth=79
" Vimwiki filetype plugin file
" Author: Maxim Kim <habamax@gmail.com>
" Home: http://code.google.com/p/vimwiki/

if exists("b:did_ftplugin")
  finish
endif
let b:did_ftplugin = 1  " Don't load another plugin for this buffer

" UNDO list {{{
" Reset the following options to undo this plugin.
let b:undo_ftplugin = "setlocal ".
      \ "suffixesadd< isfname< comments< ".
      \ "formatoptions< foldtext< ".
      \ "foldmethod< foldexpr< commentstring< "
" UNDO }}}

" MISC STUFF {{{

setlocal commentstring=%%%s

if g:vimwiki_conceallevel && exists("+conceallevel")
  let &l:conceallevel = g:vimwiki_conceallevel
endif

" MISC }}}

" GOTO FILE: gf {{{
execute 'setlocal suffixesadd='.VimwikiGet('ext')
setlocal isfname-=[,]
" gf}}}

" Autocreate list items {{{
" for list items, and list items with checkboxes
setlocal formatoptions+=tnro
setlocal formatoptions-=cq
if VimwikiGet('syntax') == 'default'
  setl comments=b:*,b:#,b:-
  setl formatlistpat=^\\s*[*#-]\\s*
elseif VimwikiGet('syntax') == 'markdown'
  setlocal comments=fb:*,fb:-,fb:+,nb:> commentstring=\ >\ %s
  setlocal formatlistpat=^\\s*\\d\\+\\.\\s\\+\\\|^[-*+]\\s\\+j
else
  setl comments=n:*,n:#
endif

if !empty(&langmap)
  " Valid only if langmap is a comma separated pairs of chars
  let l_o = matchstr(&langmap, '\C,\zs.\zeo,')
  if l_o
    exe 'nnoremap <buffer> '.l_o.' :call vimwiki#lst#kbd_oO("o")<CR>a'
  endif

  let l_O = matchstr(&langmap, '\C,\zs.\zeO,')
  if l_O
    exe 'nnoremap <buffer> '.l_O.' :call vimwiki#lst#kbd_oO("O")<CR>a'
  endif
endif

" COMMENTS }}}

" FOLDING for headers and list items using expr fold method. {{{

" Folding list items using expr fold method. {{{

function! s:get_base_level(lnum) "{{{
  let lnum = a:lnum - 1
  while lnum > 0
    if getline(lnum) =~ g:vimwiki_rxHeader
      return vimwiki#u#count_first_sym(getline(lnum))
    endif
    let lnum -= 1
  endwhile
  return 0
endfunction "}}}

function! s:find_forward(rx_item, lnum) "{{{
  let lnum = a:lnum + 1

  while lnum <= line('$')
    let line = getline(lnum)
    if line =~ a:rx_item
          \ || line =~ '^\S'
          \ || line =~ g:vimwiki_rxHeader
      break
    endif
    let lnum += 1
  endwhile

  return [lnum, getline(lnum)]
endfunction "}}}

function! s:find_backward(rx_item, lnum) "{{{
  let lnum = a:lnum - 1

  while lnum > 1
    let line = getline(lnum)
    if line =~ a:rx_item
          \ || line =~ '^\S'
      break
    endif
    let lnum -= 1
  endwhile

  return [lnum, getline(lnum)]
endfunction "}}}

function! s:get_li_level(lnum) "{{{
  if VimwikiGet('syntax') == 'media'
    let level = vimwiki#u#count_first_sym(getline(a:lnum))
  else
    let level = (indent(a:lnum) / &sw)
  endif
  return level
endfunction "}}}

function! s:get_start_list(rx_item, lnum) "{{{
  let lnum = a:lnum
  while lnum >= 1
    let line = getline(lnum)
    if line !~ a:rx_item && line =~ '^\S'
      return nextnonblank(lnum + 1)
    endif
    let lnum -= 1
  endwhile
  return 0
endfunction "}}}

function! VimwikiFoldListLevel(lnum) "{{{
  let line = getline(a:lnum)

  "" XXX Disabled: Header/section folding...
  "if line =~ g:vimwiki_rxHeader
  "  return '>'.vimwiki#u#count_first_sym(line)
  "endif

  "let nnline = getline(a:lnum+1)

  "" Unnecessary?
  "if nnline =~ g:vimwiki_rxHeader
  "  return '<'.vimwiki#u#count_first_sym(nnline)
  "endif
  "" Very slow when called on every single line!
  "let base_level = s:get_base_level(a:lnum)

  "FIXME does not work correctly
  let base_level = 0

  if line =~ g:vimwiki_rxListItem
    let [nnum, nline] = s:find_forward(g:vimwiki_rxListItem, a:lnum)
    let level = s:get_li_level(a:lnum)
    let leveln = s:get_li_level(nnum)
    let adj = s:get_li_level(s:get_start_list(g:vimwiki_rxListItem, a:lnum))

    if leveln > level
      return ">".(base_level+leveln-adj)
    " check if multilined list item
    elseif (nnum-a:lnum) > 1
          \ && (nline =~ g:vimwiki_rxListItem || nnline !~ '^\s*$')
      return ">".(base_level+level+1-adj)
    else
      return (base_level+level-adj)
    endif
  else
    " process multilined list items
    let [pnum, pline] = s:find_backward(g:vimwiki_rxListItem, a:lnum)
    if pline =~ g:vimwiki_rxListItem
      if indent(a:lnum) >= indent(pnum) && line !~ '^\s*$'
        let level = s:get_li_level(pnum)
        let adj = s:get_li_level(s:get_start_list(g:vimwiki_rxListItem, pnum))
        return (base_level+level+1-adj)
      endif
    endif
  endif

  return base_level
endfunction "}}}
" Folding list items }}}

" Folding sections and code blocks using expr fold method. {{{
function! VimwikiFoldLevel(lnum) "{{{
  let line = getline(a:lnum)

  " Header/section folding...
  if line =~ g:vimwiki_rxHeader
    return '>'.vimwiki#u#count_first_sym(line)
  " Code block folding...
  " >>>LJ
"   elseif line =~ '^\s*'.g:vimwiki_rxPreStart
"     return 'a1'
"   elseif line =~ '^\s*'.g:vimwiki_rxPreEnd.'\s*$'
"     return 's1'
"   ==========
  elseif line =~ '^\s*$'
    return -1
  "<<<LJ
  else
    return "="
  endif

endfunction "}}}

" Constants used by VimwikiFoldText {{{
" use \u2026 and \u21b2 (or \u2424) if enc=utf-8 to save screen space
let s:ellipsis = (&enc ==? 'utf-8') ? "\u2026" : "..."
let s:ell_len = strlen(s:ellipsis)
let s:newline = (&enc ==? 'utf-8') ? "\u21b2 " : "  "
let s:tolerance = 5
" }}}

function! s:shorten_text_simple(text, len) "{{{ unused
  let spare_len = a:len - len(a:text)
  return (spare_len>=0) ? [a:text,spare_len] : [a:text[0:a:len].s:ellipsis, -1]
endfunction "}}}

" s:shorten_text(text, len) = [string, spare] with "spare" = len-strlen(string)
" for long enough "text", the string's length is within s:tolerance of "len"
" (so that -s:tolerance <= spare <= s:tolerance, "string" ends with s:ellipsis)
function! s:shorten_text(text, len) "{{{ returns [string, spare]
  let spare_len = a:len - strlen(a:text)
  if (spare_len + s:tolerance >= 0)
    return [a:text, spare_len]
  endif
  " try to break on a space; assumes a:len-s:ell_len >= s:tolerance
  let newlen = a:len - s:ell_len
  let idx = strridx(a:text, ' ', newlen + s:tolerance)
  let break_idx = (idx + s:tolerance >= newlen) ? idx : newlen
  return [a:text[0:break_idx].s:ellipsis, newlen - break_idx]
endfunction "}}}

function! VimwikiFoldText() "{{{
  let line = getline(v:foldstart)
  let main_text = substitute(line, '^\s*', repeat(' ',indent(v:foldstart)), '')
  let fold_len = v:foldend - v:foldstart + 1
  let len_text = ' ['.fold_len.'] '
  if line !~ '^\s*'.g:vimwiki_rxPreStart
    let [main_text, spare_len] = s:shorten_text(main_text, 50)
    return main_text.len_text
  else
    " fold-text for code blocks: use one or two of the starting lines
    let [main_text, spare_len] = s:shorten_text(main_text, 24)
    let line1 = substitute(getline(v:foldstart+1), '^\s*', ' ', '')
    let [content_text, spare_len] = s:shorten_text(line1, spare_len+20)
    if spare_len > s:tolerance && fold_len > 3
      let line2 = substitute(getline(v:foldstart+2), '^\s*', s:newline, '')
      let [more_text, spare_len] = s:shorten_text(line2, spare_len+12)
      let content_text .= more_text
    endif
    return main_text.len_text.content_text
  endif
endfunction "}}}

" Folding sections and code blocks }}}
" FOLDING }}}

" COMMANDS {{{
command! -buffer Vimwiki2HTML
      \ silent w <bar>
      \ let res = vimwiki#html#Wiki2HTML(expand(VimwikiGet('path_html')),
      \                             expand('%'))
      \<bar>
      \ if res != '' | echo 'Vimwiki: HTML conversion is done.' | endif
command! -buffer Vimwiki2HTMLBrowse
      \ silent w <bar>
      \ call vimwiki#base#system_open_link(vimwiki#html#Wiki2HTML(
      \         expand(VimwikiGet('path_html')),
      \         expand('%')))
command! -buffer VimwikiAll2HTML
      \ call vimwiki#html#WikiAll2HTML(expand(VimwikiGet('path_html')))

command! -buffer VimwikiNextLink call vimwiki#base#find_next_link()
command! -buffer VimwikiPrevLink call vimwiki#base#find_prev_link()
command! -buffer VimwikiDeleteLink call vimwiki#base#delete_link()
command! -buffer VimwikiRenameLink call vimwiki#base#rename_link()
command! -buffer VimwikiFollowLink call vimwiki#base#follow_link('nosplit')
command! -buffer VimwikiGoBackLink call vimwiki#base#go_back_link()
command! -buffer VimwikiSplitLink call vimwiki#base#follow_link('split')
command! -buffer VimwikiVSplitLink call vimwiki#base#follow_link('vsplit')

command! -buffer -nargs=? VimwikiNormalizeLink call vimwiki#base#normalize_link(<f-args>)

command! -buffer VimwikiTabnewLink call vimwiki#base#follow_link('tabnew')

command! -buffer -range VimwikiToggleListItem call vimwiki#lst#ToggleListItem(<line1>, <line2>)

command! -buffer VimwikiGenerateLinks call vimwiki#base#generate_links()

command! -buffer -nargs=0 VimwikiBacklinks call vimwiki#base#backlinks()
command! -buffer -nargs=0 VWB call vimwiki#base#backlinks()

exe 'command! -buffer -nargs=* VimwikiSearch lvimgrep <args> '.
      \ escape(VimwikiGet('path').'**/*'.VimwikiGet('ext'), ' ')

exe 'command! -buffer -nargs=* VWS lvimgrep <args> '.
      \ escape(VimwikiGet('path').'**/*'.VimwikiGet('ext'), ' ')

command! -buffer -nargs=1 VimwikiGoto call vimwiki#base#goto("<args>")


" list commands
command! -buffer -nargs=* VimwikiListChangeLevel call vimwiki#lst#change_level(<f-args>)

" table commands
command! -buffer -nargs=* VimwikiTable call vimwiki#tbl#create(<f-args>)
command! -buffer VimwikiTableAlignQ call vimwiki#tbl#align_or_cmd('gqq')
command! -buffer VimwikiTableAlignW call vimwiki#tbl#align_or_cmd('gww')
command! -buffer VimwikiTableMoveColumnLeft call vimwiki#tbl#move_column_left()
command! -buffer VimwikiTableMoveColumnRight call vimwiki#tbl#move_column_right()

" diary commands
command! -buffer VimwikiDiaryNextDay call vimwiki#diary#goto_next_day()
command! -buffer VimwikiDiaryPrevDay call vimwiki#diary#goto_prev_day()

" COMMANDS }}}

" KEYBINDINGS {{{
if g:vimwiki_use_mouse
  nmap <buffer> <S-LeftMouse> <NOP>
  nmap <buffer> <C-LeftMouse> <NOP>
  nnoremap <silent><buffer> <2-LeftMouse> :call vimwiki#base#follow_link("nosplit", "\<lt>2-LeftMouse>")<CR>
  nnoremap <silent><buffer> <S-2-LeftMouse> <LeftMouse>:VimwikiSplitLink<CR>
  nnoremap <silent><buffer> <C-2-LeftMouse> <LeftMouse>:VimwikiVSplitLink<CR>
  nnoremap <silent><buffer> <RightMouse><LeftMouse> :VimwikiGoBackLink<CR>
endif


if !hasmapto('<Plug>Vimwiki2HTML')
  nmap <buffer> <Leader>wh <Plug>Vimwiki2HTML
endif
nnoremap <script><buffer>
      \ <Plug>Vimwiki2HTML :Vimwiki2HTML<CR>

if !hasmapto('<Plug>Vimwiki2HTMLBrowse')
  nmap <buffer> <Leader>whh <Plug>Vimwiki2HTMLBrowse
endif
nnoremap <script><buffer>
      \ <Plug>Vimwiki2HTMLBrowse :Vimwiki2HTMLBrowse<CR>

if !hasmapto('<Plug>VimwikiFollowLink')
  nmap <silent><buffer> <CR> <Plug>VimwikiFollowLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiFollowLink :VimwikiFollowLink<CR>

if !hasmapto('<Plug>VimwikiSplitLink')
  nmap <silent><buffer> <S-CR> <Plug>VimwikiSplitLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiSplitLink :VimwikiSplitLink<CR>

if !hasmapto('<Plug>VimwikiVSplitLink')
  nmap <silent><buffer> <C-CR> <Plug>VimwikiVSplitLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiVSplitLink :VimwikiVSplitLink<CR>

if !hasmapto('<Plug>VimwikiNormalizeLink')
  nmap <silent><buffer> + <Plug>VimwikiNormalizeLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiNormalizeLink :VimwikiNormalizeLink 0<CR>

if !hasmapto('<Plug>VimwikiNormalizeLinkVisual')
  vmap <silent><buffer> + <Plug>VimwikiNormalizeLinkVisual
endif
vnoremap <silent><script><buffer>
      \ <Plug>VimwikiNormalizeLinkVisual :<C-U>VimwikiNormalizeLink 1<CR>

if !hasmapto('<Plug>VimwikiNormalizeLinkVisualCR')
  vmap <silent><buffer> <CR> <Plug>VimwikiNormalizeLinkVisualCR
endif
vnoremap <silent><script><buffer>
      \ <Plug>VimwikiNormalizeLinkVisualCR :<C-U>VimwikiNormalizeLink 1<CR>

if !hasmapto('<Plug>VimwikiTabnewLink')
  nmap <silent><buffer> <D-CR> <Plug>VimwikiTabnewLink
  nmap <silent><buffer> <C-S-CR> <Plug>VimwikiTabnewLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiTabnewLink :VimwikiTabnewLink<CR>

if !hasmapto('<Plug>VimwikiGoBackLink')
  nmap <silent><buffer> <BS> <Plug>VimwikiGoBackLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiGoBackLink :VimwikiGoBackLink<CR>

if !hasmapto('<Plug>VimwikiNextLink')
  nmap <silent><buffer> <TAB> <Plug>VimwikiNextLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiNextLink :VimwikiNextLink<CR>

if !hasmapto('<Plug>VimwikiPrevLink')
  nmap <silent><buffer> <S-TAB> <Plug>VimwikiPrevLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiPrevLink :VimwikiPrevLink<CR>

if !hasmapto('<Plug>VimwikiDeleteLink')
  nmap <silent><buffer> <Leader>wd <Plug>VimwikiDeleteLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiDeleteLink :VimwikiDeleteLink<CR>

if !hasmapto('<Plug>VimwikiRenameLink')
  nmap <silent><buffer> <Leader>wr <Plug>VimwikiRenameLink
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiRenameLink :VimwikiRenameLink<CR>

if !hasmapto('<Plug>VimwikiToggleListItem')
  nmap <silent><buffer> <C-Space> <Plug>VimwikiToggleListItem
  vmap <silent><buffer> <C-Space> <Plug>VimwikiToggleListItem
  if has("unix")
    nmap <silent><buffer> <C-@> <Plug>VimwikiToggleListItem
  endif
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiToggleListItem :VimwikiToggleListItem<CR>

if !hasmapto('<Plug>VimwikiDiaryNextDay')
  nmap <silent><buffer> <C-Down> <Plug>VimwikiDiaryNextDay
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiDiaryNextDay :VimwikiDiaryNextDay<CR>

if !hasmapto('<Plug>VimwikiDiaryPrevDay')
  nmap <silent><buffer> <C-Up> <Plug>VimwikiDiaryPrevDay
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiDiaryPrevDay :VimwikiDiaryPrevDay<CR>

function! s:CR() "{{{
  let res = vimwiki#lst#kbd_cr()
  if res == "\<CR>" && g:vimwiki_table_mappings
    let res = vimwiki#tbl#kbd_cr()
  endif
  return res
endfunction "}}}

" List and Table <CR> mapping
inoremap <buffer> <expr> <CR> <SID>CR()

" List mappings
nnoremap <buffer> o :<C-U>call vimwiki#lst#kbd_oO('o')<CR>
nnoremap <buffer> O :<C-U>call vimwiki#lst#kbd_oO('O')<CR>
nnoremap <buffer> gll :VimwikiListChangeLevel <<<CR>
nnoremap <buffer> glm :VimwikiListChangeLevel >><CR>
nnoremap <buffer> gl* :VimwikiListChangeLevel *<CR>
nnoremap <buffer> gl8 :VimwikiListChangeLevel *<CR>
if VimwikiGet('syntax') == 'default'
  nnoremap <buffer> gl- :VimwikiListChangeLevel -<CR>
  nnoremap <buffer> gl# :VimwikiListChangeLevel #<CR>
  nnoremap <buffer> gl3 :VimwikiListChangeLevel #<CR>
elseif VimwikiGet('syntax') == 'markdown'
  nnoremap <buffer> gl- :VimwikiListChangeLevel -<CR>
  nnoremap <buffer> gl1 :VimwikiListChangeLevel 1.<CR>
elseif VimwikiGet('syntax') == 'media'
  nnoremap <buffer> gl# :VimwikiListChangeLevel #<CR>
  nnoremap <buffer> gl3 :VimwikiListChangeLevel #<CR>
endif


" Table mappings
if g:vimwiki_table_mappings
  inoremap <expr> <buffer> <Tab> vimwiki#tbl#kbd_tab()
  inoremap <expr> <buffer> <S-Tab> vimwiki#tbl#kbd_shift_tab()
endif

nnoremap <buffer> gqq :VimwikiTableAlignQ<CR>
nnoremap <buffer> gww :VimwikiTableAlignW<CR>
if !hasmapto('<Plug>VimwikiTableMoveColumnLeft')
  nmap <silent><buffer> <A-Left> <Plug>VimwikiTableMoveColumnLeft
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiTableMoveColumnLeft :VimwikiTableMoveColumnLeft<CR>
if !hasmapto('<Plug>VimwikiTableMoveColumnRight')
  nmap <silent><buffer> <A-Right> <Plug>VimwikiTableMoveColumnRight
endif
nnoremap <silent><script><buffer>
      \ <Plug>VimwikiTableMoveColumnRight :VimwikiTableMoveColumnRight<CR>



" Text objects {{{
onoremap <silent><buffer> ah :<C-U>call vimwiki#base#TO_header(0, 0)<CR>
vnoremap <silent><buffer> ah :<C-U>call vimwiki#base#TO_header(0, 1)<CR>

onoremap <silent><buffer> ih :<C-U>call vimwiki#base#TO_header(1, 0)<CR>
vnoremap <silent><buffer> ih :<C-U>call vimwiki#base#TO_header(1, 1)<CR>

onoremap <silent><buffer> a\ :<C-U>call vimwiki#base#TO_table_cell(0, 0)<CR>
vnoremap <silent><buffer> a\ :<C-U>call vimwiki#base#TO_table_cell(0, 1)<CR>

onoremap <silent><buffer> i\ :<C-U>call vimwiki#base#TO_table_cell(1, 0)<CR>
vnoremap <silent><buffer> i\ :<C-U>call vimwiki#base#TO_table_cell(1, 1)<CR>

onoremap <silent><buffer> ac :<C-U>call vimwiki#base#TO_table_col(0, 0)<CR>
vnoremap <silent><buffer> ac :<C-U>call vimwiki#base#TO_table_col(0, 1)<CR>

onoremap <silent><buffer> ic :<C-U>call vimwiki#base#TO_table_col(1, 0)<CR>
vnoremap <silent><buffer> ic :<C-U>call vimwiki#base#TO_table_col(1, 1)<CR>

if !hasmapto('<Plug>VimwikiAddHeaderLevel')
  nmap <silent><buffer> = <Plug>VimwikiAddHeaderLevel
endif
nnoremap <silent><buffer> <Plug>VimwikiAddHeaderLevel :
      \<C-U>call vimwiki#base#AddHeaderLevel()<CR>

if !hasmapto('<Plug>VimwikiRemoveHeaderLevel')
  nmap <silent><buffer> - <Plug>VimwikiRemoveHeaderLevel
endif
nnoremap <silent><buffer> <Plug>VimwikiRemoveHeaderLevel :
      \<C-U>call vimwiki#base#RemoveHeaderLevel()<CR>


" }}}

" KEYBINDINGS }}}

" AUTOCOMMANDS {{{
if VimwikiGet('auto_export')
  " Automatically generate HTML on page write.
  augroup vimwiki
    au BufWritePost <buffer>
      \ call vimwiki#html#Wiki2HTML(expand(VimwikiGet('path_html')),
      \                             expand('%'))
  augroup END
endif

" AUTOCOMMANDS }}}

" PASTE, CAT URL {{{
" html commands
command! -buffer VimwikiPasteUrl call vimwiki#html#PasteUrl(expand('%:p'))
command! -buffer VimwikiCatUrl call vimwiki#html#CatUrl(expand('%:p'))
" }}}

" DEBUGGING {{{
command! VimwikiPrintWikiState call vimwiki#base#print_wiki_state()
command! VimwikiReadLocalOptions call vimwiki#base#read_wiki_options(1)
" }}}
