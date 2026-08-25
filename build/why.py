# -*- coding: utf-8 -*-
"""Объяснение «Почему так правильно» — подбирается по конструкции фразы."""
import re

RULES = [
 (r'^\s*(what|where|when|who|which|how|why)\b',
  'Вопрос со словом-вопросом',
  'Порядок: вопросительное слово → is/are → кто или что. «Where is the hospital?» — не «Where the hospital is».'),

 (r'\b(have|has)\s+\w+ed\b|\b(have|has)\s+(been|lost|left|got|made|seen|done|worked|written|taken|heard)\b',
  'Present Perfect: have + третья форма',
  'Действие в прошлом, но важен результат сейчас. «I have lost my bag» — потерял и до сих пор нет. Через for и since: «for three years».'),

 (r'\b(was|were)\b',
  'Прошедшее время глагола be',
  'I/he/she/it → was, you/we/they → were. «That was delicious», «They were here».'),

 (r'\b(went|bought|left|lost|got|saw|told|forgot|won|said|came|made|took|had|met|spoke|wrote|gave|found|felt|knew|paid|ran|drank|ate|slept|stole|hurt)\b',
  'Прошедшее время: неправильный глагол',
  'У этих глаголов нет окончания -ed, форму нужно помнить: go → went, buy → bought, leave → left, lose → lost, see → saw, tell → told.'),

 (r'\b\w+ed\b',
  'Прошедшее время: правильный глагол',
  'К глаголу добавляется -ed: work → worked, move → moved, happen → happened. В отрицании и вопросе -ed уходит: «I did not work».'),

 (r'\b(am|is|are)\s+\w+ing\b',
  'Present Continuous: происходит сейчас',
  'am/is/are + глагол с -ing. «I am waiting» — жду прямо сейчас, в отличие от «I wait» — вообще, обычно.'),

 (r'\bthere\s+(is|are|was|were)\b',
  'Оборот there is / there are',
  'Так говорят о наличии: «There is a problem». Один предмет → there is, несколько → there are.'),

 (r'\b(do not|does not|did not|cannot|is not|are not|was not|were not|will not)\b',
  'Отрицание',
  'Частица not идёт после вспомогательного или модального глагола. «I did not get the letter» — смысловой глагол при этом в начальной форме.'),

 (r'\bwill\b',
  'Будущее с will',
  'will + глагол без to, одинаково для всех лиц. «I will think about it».'),

 (r'\bmore \w+|\b\w+er than\b|\bthe \w+est\b|\bcheaper\b|\bnewer\b|\bbetter\b',
  'Сравнение',
  'Короткие слова: cheap → cheaper. Длинные: expensive → more expensive. После сравнения ставят than: «cheaper than this one».'),

 (r'\b(at|on|in)\s+(the\s+)?\w*(morning|evening|night|monday|nine|six|week|month|year|time)\b',
  'Предлоги времени',
  'at — точное время (at six), on — день (on Monday), in — часть суток и период (in the morning, in a week). Ошибка «in Monday» — типичная.'),

 (r'\b(pay by|by card|for the|to the|with the|about it|from here)\b',
  'Предлог на своём месте',
  'Предлог стоит перед тем словом, к которому относится: «tickets for the train», «pay by card», «talk about it». В русском предлог часто другой.'),

 (r'\b(a|an)\b',
  'Артикль a / an',
  'a перед согласным звуком, an перед гласным: a doctor, an hour. Ставится, когда предмет называют впервые или он один из многих.'),

 (r'\bthe\b',
  'Артикль the',
  'the — когда собеседник понимает, о чём речь: «the bill», «the shop». Уже упоминали или предмет единственный в этом месте.'),

]

DEFAULT = ('Порядок слов в английском',
           'Строгий порядок: сначала кто, потом что делает, потом остальное. Подлежащее и глагол местами не меняются, даже если в русском они переставлены.')


def why(answer: str):
    a = ' ' + answer.lower().replace('’', "'") + ' '
    for pat, title, text in RULES:
        if re.search(pat, a):
            return title, text
    return DEFAULT
