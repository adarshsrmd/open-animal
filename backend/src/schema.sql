-- Run with:  psql -d animalcare -f schema.sql
-- Safe to re-run: it drops and recreates everything.

DROP TABLE IF EXISTS saved_articles, animal_records, reminders, animals, diseases, articles, vets CASCADE;

CREATE TABLE animals (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  age         INTEGER NOT NULL DEFAULT 0 CHECK (age BETWEEN 0 AND 40),
  status      TEXT NOT NULL DEFAULT 'Healthy' CHECK (status IN ('Healthy', 'Vaccination Due')),
  note        TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE animal_records (
  id           SERIAL PRIMARY KEY,
  animal_id    INTEGER NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  note         TEXT NOT NULL,
  recorded_on  DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE reminders (
  id         SERIAL PRIMARY KEY,
  animal_id  INTEGER REFERENCES animals(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  due_date   DATE NOT NULL,
  done       BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE diseases (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  species     TEXT NOT NULL,
  urgency     TEXT NOT NULL,
  about       TEXT NOT NULL,
  prevention  TEXT NOT NULL,
  symptoms    TEXT[] NOT NULL
);

CREATE TABLE articles (
  id           TEXT PRIMARY KEY,
  tag          TEXT NOT NULL,
  title        TEXT NOT NULL,
  description  TEXT NOT NULL,
  body         TEXT[] NOT NULL,
  takeaways    TEXT[] NOT NULL,
  minutes      INTEGER NOT NULL DEFAULT 3
);

CREATE TABLE saved_articles (
  article_id  TEXT PRIMARY KEY REFERENCES articles(id) ON DELETE CASCADE,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE vets (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL CHECK (type IN ('Vet', 'Shelter', 'Rescue')),
  distance_km  NUMERIC(5,1) NOT NULL,
  hours        TEXT NOT NULL,
  phone        TEXT NOT NULL,
  address      TEXT NOT NULL,
  open_24h     BOOLEAN NOT NULL DEFAULT false
);

CREATE INDEX idx_reminders_due ON reminders(due_date);
CREATE INDEX idx_records_animal ON animal_records(animal_id);

-- ---------- Sample data ----------
INSERT INTO animals (name, type, age, status, note) VALUES
  ('Bessie', 'Cow',  4, 'Healthy',         'Milking normally and eating well.'),
  ('Luna',   'Goat', 2, 'Vaccination Due', 'Rabies vaccine is coming due.'),
  ('Max',    'Dog',  3, 'Healthy',         'Active and healthy.');

INSERT INTO animal_records (animal_id, note, recorded_on) VALUES
  (1, 'General checkup. No concerns.',         CURRENT_DATE - 90),
  (1, 'Foot-and-mouth vaccine given.',         CURRENT_DATE - 200),
  (2, 'Rabies vaccine given.',                 CURRENT_DATE - 360),
  (3, 'Annual checkup. Healthy.',              CURRENT_DATE - 120),
  (3, 'Parvo booster given.',                  CURRENT_DATE - 120);

INSERT INTO reminders (animal_id, title, due_date) VALUES
  (2, 'Rabies Vaccine',  CURRENT_DATE + 7),
  (1, 'Deworming',       CURRENT_DATE + 21),
  (3, 'Annual Checkup',  CURRENT_DATE + 60);

INSERT INTO diseases (id, name, species, urgency, about, prevention, symptoms) VALUES
  ('mastitis','Mastitis','Cattle','See a vet soon','An infection of the udder, common in dairy animals.','Keep bedding clean, disinfect teats after milking, and keep milking equipment well maintained.',ARRAY['Swollen udder','Clotted milk','Fever','Reduced appetite']),
  ('fmd','Foot-and-Mouth Disease','Cattle','Emergency – report to authorities','A highly contagious viral disease of cloven-hoofed animals.','Vaccinate where advised, isolate new animals, and restrict farm visitors.',ARRAY['Fever','Mouth blisters','Drooling','Limping']),
  ('bloat','Bloat','Goat','Emergency','Gas builds up in the stomach, often after sudden feed changes.','Change feed gradually, give enough roughage, and avoid wet lush pasture on an empty stomach.',ARRAY['Swollen belly','Discomfort','Drooling','Reduced appetite']),
  ('newcastle','Newcastle Disease','Poultry','Emergency – report to authorities','A fast-spreading viral disease that affects the breathing and nerves of birds.','Follow the vaccination schedule, keep biosecurity tight, and quarantine new birds.',ARRAY['Coughing','Twisted neck','Drop in egg laying','Diarrhea']),
  ('parvo','Canine Parvovirus','Dog','Emergency','A serious viral illness, most dangerous for puppies.','Complete the puppy vaccine series and avoid contact with unvaccinated dogs.',ARRAY['Vomiting','Bloody diarrhea','Fever','Lethargy','Reduced appetite']),
  ('rabies','Rabies','All mammals','Emergency','A fatal viral disease that can spread to people.','Keep rabies vaccines up to date and avoid contact with wild animals.',ARRAY['Aggression','Drooling','Fever','Paralysis']);

INSERT INTO articles (id, tag, title, description, body, takeaways, minutes) VALUES
  ('cattle','Cattle','Common Diseases in Cattle','Learn about common cattle diseases, symptoms and prevention tips.',ARRAY['Mastitis, bloat, foot rot and tick fever are among the most common problems in cattle.','Watch for changes in appetite, milk yield, walking and temperature. Early treatment is cheaper and safer.','Prevention rests on clean housing, regular vaccination and deworming, and a balanced diet.'],ARRAY['Check temperature and appetite daily','Vaccinate and deworm on schedule','Isolate sick animals early'],4),
  ('goat','Goat','Goat Nutrition Guide','Essential nutrients and feeding recommendations for healthy goats.',ARRAY['Goats need good quality roughage first: pasture, browse or hay.','Add minerals formulated for goats. Copper needs differ from sheep.','Always provide clean water and change feed gradually over 7–10 days.'],ARRAY['Roughage first, grain second','Use goat-specific minerals','Change feeds slowly'],3),
  ('poultry','Poultry','Poultry Vaccination Schedule','Keep your flock protected with the right vaccination schedule.',ARRAY['Chicks are usually vaccinated against Marek’s disease at hatch, then Newcastle disease and infectious bronchitis in the first weeks.','Schedules vary by region and flock type. Confirm yours with a local vet.','Record every vaccination date so boosters are not missed.'],ARRAY['Vaccinate from day one','Confirm the schedule locally','Keep written records'],3),
  ('dog','Dogs','Dog Vaccination Basics','Core vaccines every dog needs and when to give them.',ARRAY['Core vaccines cover parvovirus, distemper, adenovirus and rabies.','Puppies start at 6–8 weeks with boosters every 3–4 weeks until about 16 weeks.','Adult dogs need boosters on the schedule your vet recommends.'],ARRAY['Start puppies at 6–8 weeks','Finish the full series','Keep boosters current'],3),
  ('heat','General','Spotting Heat Stress','Signs of heat stress in farm animals and how to cool them safely.',ARRAY['Look for heavy panting, drooling, weakness and reduced eating.','Move animals to shade, offer cool water, and use fans or sprinklers if you can.','Call a vet if an animal collapses or does not recover quickly.'],ARRAY['Shade and water first','Cool gradually','Call a vet if it collapses'],2),
  ('aid','General','First Aid for Farm Animals','What to keep in your kit and what to do before the vet arrives.',ARRAY['Keep a thermometer, clean bandages, saline, gloves and your vet’s number together.','Control bleeding with firm pressure and keep the animal calm and still.','First aid buys time. It does not replace a vet visit.'],ARRAY['Build a kit now','Pressure stops most bleeding','Always follow up with a vet'],4);

INSERT INTO vets (name, type, distance_km, hours, phone, address, open_24h) VALUES
  ('Greenfield Veterinary Hospital','Vet',2.4,'Open 24 hours','+10000000001','12 Meadow Lane',true),
  ('Riverside Large Animal Clinic','Vet',5.1,'8am – 6pm','+10000000002','19 Meadow Lane',false),
  ('Happy Tails Shelter','Shelter',3.8,'9am – 5pm','+10000000003','26 Meadow Lane',false),
  ('Farm Animal Rescue Network','Rescue',7.2,'Open 24 hours','+10000000004','33 Meadow Lane',true),
  ('Village Vet Care','Vet',9.6,'9am – 4pm','+10000000005','40 Meadow Lane',false);
