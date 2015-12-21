import os
import time
from flask import Flask, jsonify, json, redirect
app = Flask(__name__)
application = app # wsgi-compliant

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(ROOT, 'data.json')

def load():
    try:
        with open(DATA) as f:
            return json.load(f)
    except IOError:
        return {'start': None}

def save(data):
    with open(DATA, 'w') as f:
        json.dump(data, f)


@app.route('/start')
def start():
    data = {'start': time.time()}
    save(data)
    return redirect('/status')

@app.route('/reset')
def reset():
    save({'start': None})
    return 'reset done'

def padlock(start_time, delay, secret):
    if start_time is None:
        return ('stopped', delay)
    diff = time.time() - start_time
    if diff >= delay:
        return ('secret', secret)
    return ('started', delay-diff)

@app.route('/status')
def status():
    start_time = load()['start']
    pink = padlock(start_time, 5, 135)    # 13/05/1982 :)
    blue = padlock(start_time, 15, 117) # 11/07/2015 :)
    magenta = padlock(start_time, 30, 143) # 143 days since we have met
    return jsonify(pink=pink, blue=blue, magenta=magenta)

if __name__ == '__main__':
    app.run(debug=True)
