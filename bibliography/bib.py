# -*- coding: utf-8 -*-

#
# This file is part of Fidus Writer <http://www.fiduswriter.com>
#
# Copyright (C) 2013 Takuto Kojima, Johannes Wilm
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as
# published by the Free Software Foundation, either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with this program.  If not, see <http://www.gnu.org/licenses/>.

import re
import dateutil.parser
class Persons(object):
    def __init__(self, names):
        names = names.strip()
        self.persons = []
        if names:
            self.parse_persons(names)
        
    def parse_persons(self, names):
        persons = []
        token_re = re.compile(r"([^\s{}]+|\s|{|})")
        j = 0
        k = 0
        for item in token_re.finditer(names):
            if k == len(persons) :
                persons.append('')
            token = item.group(0)
            if '{' == token :
                j += 1
            if '}' == token :
                j -= 1
            if 'and' == token and 0 == j :
                k += 1
            else :
                persons[k] += token
        persons_len = len(persons)
        for person in persons :
            self.persons.append(self.parse_name(person))
            
    def parse_name(self, name):
        name_dict = {}
        _first = []
        _last = []
        def process_first_middle(parts):
            try:
                _first.append(parts[0])
                _first.extend(parts[1:])
                name_dict['first'] = ' '.join(_first)
            except IndexError:
                pass

        def process_von_last(parts, lineage = []):
            von, last = rsplit_at(parts, lambda part: part.islower())
            if von and not last:
                last.append(von.pop())
            _last.extend(von)
            _last.extend(last)
            _last.extend(lineage)
            name_dict['last'] = ' '.join(_last)

        def find_pos(lst, pred):
            for i, item in enumerate(lst):
                if pred(item):
                    return i
            return i + 1

        def split_at(lst, pred):
            #Split the given list into two parts.
            #The second part starts with the first item for which the given
            #predicate is True.
            pos = find_pos(lst, pred)
            return lst[:pos], lst[pos:]

        def rsplit_at(lst, pred):
            rpos = find_pos(reversed(lst), pred)
            pos = len(lst) - rpos
            return lst[:pos], lst[pos:]

        parts = self.split_tex_string(name, ',')
        if len(parts) == 3: # von Last, Jr, First
            process_von_last(self.split_tex_string(parts[0]), self.split_tex_string(parts[1]))
            process_first_middle(self.split_tex_string(parts[2]))
        elif len(parts) == 2: # von Last, First
            process_von_last(self.split_tex_string(parts[0]))
            process_first_middle(self.split_tex_string(parts[1]))
        elif len(parts) == 1: # First von Last
            parts = self.split_tex_string(name)
            if len(parts) == 1:
                name_dict['first'] = parts[0]
            else:
                first_middle, von_last = split_at(parts, lambda part: part.islower())
                if not von_last and first_middle:
                    last = first_middle.pop()
                    von_last.append(last)
                process_first_middle(first_middle)
                process_von_last(von_last)
        else:
            name_dict['first'] = name
        return name_dict
        
    def split_tex_string(self, string, sep=None):
        if sep is None:
            sep = '[\s~]+'
        strip=True
        filter_empty=False
        sep_re = re.compile(sep)
        brace_level = 0
        name_start = 0
        result = []
        string_len = len(string)
        pos = 0
        for pos, char in enumerate(string):
            if char == '{':
                brace_level += 1
            elif char == '}':
                brace_level -= 1
            elif brace_level == 0 and pos > 0:
                match = sep_re.match(string[pos:])
                if match:
                    sep_len = len(match.group())
                    if pos + sep_len < string_len:
                        result.append(string[name_start:pos])
                        name_start = pos + sep_len
        if name_start < string_len:
            result.append(string[name_start:])
        return [part.strip(' {}') for part in result]
    
    def get_names(self):
        ref = []
        for person in self.persons :
            name = ''
            if 'first' in person :
                name = '{' + person['first'] + '}'
            if 'last' in person :
                if '' == name :
                    name = '{' + person['last'] + '}'
                else :
                    name += ' {' + person['last'] + '}'
            ref.append(name)
        return ref

class BibDate(object):
    def __init__(self, date_str):
        date_str = date_str.replace('-AA','')
        self.date = 'AA-AA-AA'
        date_format = '%Y-AA-AA'
        date_spliter = re.compile(r"[\s,\./\-]")
        date_len = len(date_spliter.split(date_str))
        if 2 < date_len :
            date_format = '%Y-%m-%d'
        elif 2 == date_len :
            date_format = '%Y-%m-AA'
        try :
            the_date = dateutil.parser.parse(date_str)
            self.date = the_date.strftime(date_format)
        except ValueError :
            pass
        