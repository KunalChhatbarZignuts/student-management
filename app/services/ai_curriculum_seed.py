import logging
import uuid
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.models.classroom import Subject
from app.models.ai_learning import SubjectChapter, ChapterTopic

logger = logging.getLogger(__name__)

STANDARD_CURRICULUM = {
    "Mathematics": [
        {
            "chapter_number": 1,
            "title": "Number Systems & Arithmetic",
            "description": "Foundational operations, rational numbers, exponents, and numerical reasoning.",
            "topics": [
                {"title": "Real Numbers & Rational Exponents", "objective": "Understand real number classification and exponent rules.", "difficulty": "EASY", "minutes": 15},
                {"title": "Prime Factorization & Divisibility", "objective": "Apply HCF and LCM prime factorization methods.", "difficulty": "EASY", "minutes": 20},
                {"title": "Surds and Scientific Notation", "objective": "Simplify radical expressions and scientific notation.", "difficulty": "MEDIUM", "minutes": 20},
            ]
        },
        {
            "chapter_number": 2,
            "title": "Algebra & Linear Equations",
            "description": "Formulating expressions, solving linear equations, and interpreting graph solutions.",
            "topics": [
                {"title": "Linear Equations in One Variable", "objective": "Isolate variables using inverse operations.", "difficulty": "EASY", "minutes": 15},
                {"title": "Simultaneous Linear Equations in Two Variables", "objective": "Solve systems of linear equations via substitution and elimination.", "difficulty": "MEDIUM", "minutes": 25},
                {"title": "Quadratic Polynomials & Factoring", "objective": "Factor quadratic expressions and identify roots.", "difficulty": "HARD", "minutes": 30},
            ]
        },
        {
            "chapter_number": 3,
            "title": "Geometry & Mensuration",
            "description": "Properties of 2D polygons, coordinate geometry, angles, and 3D spatial calculations.",
            "topics": [
                {"title": "Triangles & Pythagorean Theorem", "objective": "Prove similarity and calculate unknown hypotenuse/legs.", "difficulty": "MEDIUM", "minutes": 20},
                {"title": "Circle Theorems & Arc Calculations", "objective": "Apply tangent rules and compute arc lengths.", "difficulty": "MEDIUM", "minutes": 25},
                {"title": "Surface Areas & Volumes of Solids", "objective": "Calculate volume and surface area of cylinders, cones, and spheres.", "difficulty": "HARD", "minutes": 25},
            ]
        },
        {
            "chapter_number": 4,
            "title": "Trigonometry & Spatial Angles",
            "description": "Right triangle ratios, unit circle concepts, and height-distance measurement problems.",
            "topics": [
                {"title": "Basic Trigonometric Ratios (sin, cos, tan)", "objective": "Compute sine, cosine, and tangent ratios in right triangles.", "difficulty": "MEDIUM", "minutes": 20},
                {"title": "Trigonometric Identities & Proofs", "objective": "Apply Pythagorean trigonometric identities to simplify expressions.", "difficulty": "HARD", "minutes": 30},
                {"title": "Heights and Distances Angle Applications", "objective": "Solve practical elevation and depression angle problems.", "difficulty": "HARD", "minutes": 25},
            ]
        },
        {
            "chapter_number": 5,
            "title": "Statistics & Probability",
            "description": "Central tendency, cumulative frequency, variance, and sample probability.",
            "topics": [
                {"title": "Measures of Central Tendency (Mean, Median, Mode)", "objective": "Calculate and interpret grouped frequency mean and median.", "difficulty": "EASY", "minutes": 15},
                {"title": "Empirical & Theoretical Probability", "objective": "Determine compound event likelihoods using tree diagrams.", "difficulty": "MEDIUM", "minutes": 20},
            ]
        }
    ],
    "General Science": [
        {
            "chapter_number": 1,
            "title": "Chemical Reactions & Equations",
            "description": "Stoichiometry, balanced equations, acid-base interactions, and redox mechanisms.",
            "topics": [
                {"title": "Balancing Chemical Equations", "objective": "Apply conservation of mass to balance stoichiometry.", "difficulty": "MEDIUM", "minutes": 20},
                {"title": "Acids, Bases, and pH Scale", "objective": "Explain neutralization, litmus indicators, and pH measurements.", "difficulty": "EASY", "minutes": 15},
                {"title": "Oxidation and Reduction Reactions", "objective": "Identify oxidizing and reducing agents in chemical processes.", "difficulty": "HARD", "minutes": 25},
            ]
        },
        {
            "chapter_number": 2,
            "title": "Life Processes & Human Physiology",
            "description": "Cellular respiration, nutrient absorption, cardiovascular circulation, and homeostasis.",
            "topics": [
                {"title": "Nutrition and Photosynthesis", "objective": "Differentiate autotrophic and heterotrophic energy conversion.", "difficulty": "EASY", "minutes": 15},
                {"title": "Circulatory & Respiratory Systems", "objective": "Map systemic circulation and pulmonary gas exchange.", "difficulty": "MEDIUM", "minutes": 25},
                {"title": "Excretion and Nephron Function", "objective": "Explain renal filtration and waste elimination.", "difficulty": "HARD", "minutes": 20},
            ]
        },
        {
            "chapter_number": 3,
            "title": "Light: Optics, Reflection & Refraction",
            "description": "Ray diagrams, spherical mirror equations, Snell's law, and optical instruments.",
            "topics": [
                {"title": "Spherical Mirrors & Ray Diagrams", "objective": "Construct focal ray diagrams for concave and convex mirrors.", "difficulty": "MEDIUM", "minutes": 20},
                {"title": "Refraction and Snell's Law", "objective": "Calculate refractive index and optical displacement.", "difficulty": "HARD", "minutes": 25},
                {"title": "Human Eye & Vision Correction", "objective": "Describe myopia, hypermetropia, and corrective lens formulas.", "difficulty": "MEDIUM", "minutes": 20},
            ]
        },
        {
            "chapter_number": 4,
            "title": "Electricity, Current & Magnetism",
            "description": "Ohm's law, electric circuits, electromagnetic induction, and domestic circuits.",
            "topics": [
                {"title": "Ohm's Law & Circuit Resistance", "objective": "Calculate current, potential difference, and equivalent resistance.", "difficulty": "MEDIUM", "minutes": 20},
                {"title": "Series vs Parallel Circuit Configurations", "objective": "Analyze current division and power loss across parallel branches.", "difficulty": "HARD", "minutes": 25},
                {"title": "Electromagnetic Induction & Motors", "objective": "State Fleming's left and right hand rules for magnetic force.", "difficulty": "HARD", "minutes": 25},
            ]
        }
    ],
    "English Literature": [
        {
            "chapter_number": 1,
            "title": "Reading Comprehension & Critical Analysis",
            "description": "Unseen passages, thematic synthesis, character motives, and rhetorical devices.",
            "topics": [
                {"title": "Fact vs Inference Extraction", "objective": "Identify implicit textual evidence and author intention.", "difficulty": "EASY", "minutes": 15},
                {"title": "Literary Devices & Figurative Language", "objective": "Identify metaphor, irony, hyperbole, and symbolism.", "difficulty": "MEDIUM", "minutes": 20},
            ]
        },
        {
            "chapter_number": 2,
            "title": "Formal Writing & Persuasion",
            "description": "Structured discursive essays, letters to editors, reports, and analytical paragraphs.",
            "topics": [
                {"title": "Formal Letter & Inquiry Writing", "objective": "Format professional correspondence with salutations and clear demands.", "difficulty": "EASY", "minutes": 15},
                {"title": "Analytical Paragraph Composition", "objective": "Synthesize data charts into cohesive comparative prose.", "difficulty": "MEDIUM", "minutes": 25},
            ]
        },
        {
            "chapter_number": 3,
            "title": "Applied Grammar & Syntax Mechanics",
            "description": "Reported speech, passive voice transformations, subject-verb concord, and prepositions.",
            "topics": [
                {"title": "Direct and Indirect Speech Rules", "objective": "Transform imperative, interrogative, and assertive speech.", "difficulty": "MEDIUM", "minutes": 20},
                {"title": "Active and Passive Transformations", "objective": "Convert tense forms accurately between active and passive voice.", "difficulty": "MEDIUM", "minutes": 20},
            ]
        }
    ],
    "Social Studies": [
        {
            "chapter_number": 1,
            "title": "The Rise of Modern Democratic Nations",
            "description": "French revolution impact, democratic revolutions, and constitutional building.",
            "topics": [
                {"title": "Liberty, Equality & The French Revolution", "objective": "Analyze the ideological foundation of modern democratic republics.", "difficulty": "EASY", "minutes": 15},
                {"title": "Colonial Movements & National Independence", "objective": "Trace anti-imperialist mass mobilizations and non-cooperation.", "difficulty": "MEDIUM", "minutes": 25},
            ]
        },
        {
            "chapter_number": 2,
            "title": "Geography, Climate & Resource Sustainability",
            "description": "Geographical distribution of water, minerals, climate zones, and ecological preservation.",
            "topics": [
                {"title": "Water Resources & Watershed Management", "objective": "Evaluate rainwater harvesting and river valley conservation.", "difficulty": "EASY", "minutes": 15},
                {"title": "Renewable vs Non-Renewable Energy Grids", "objective": "Analyze solar, wind, and hydrothermal capacity trade-offs.", "difficulty": "MEDIUM", "minutes": 20},
            ]
        }
    ],
    "Computer Science": [
        {
            "chapter_number": 1,
            "title": "Computational Thinking & Logic Design",
            "description": "Algorithmic thinking, problem decomposition, Boolean algebra, and flowcharts.",
            "topics": [
                {"title": "Flowcharts and Pseudocode Representation", "objective": "Diagram sequential, branching, and iterative program logic.", "difficulty": "EASY", "minutes": 15},
                {"title": "Binary Logic & Truth Tables", "objective": "Construct AND, OR, NOT, and XOR Boolean circuit evaluations.", "difficulty": "MEDIUM", "minutes": 20},
            ]
        },
        {
            "chapter_number": 2,
            "title": "Python Programming Fundamentals",
            "description": "Control flow, dynamic variables, functions, and collections.",
            "topics": [
                {"title": "Variables, Primitive Types & Conditionals", "objective": "Write robust if-elif-else statements with type casting.", "difficulty": "EASY", "minutes": 15},
                {"title": "Loops, Iterators & List Comprehensions", "objective": "Implement efficient for and while traversal patterns.", "difficulty": "MEDIUM", "minutes": 20},
                {"title": "Functions, Scope & Error Handling", "objective": "Structure modular code using parameters, returns, and try-except.", "difficulty": "HARD", "minutes": 25},
            ]
        }
    ]
}


def seed_default_curriculum(db: Session) -> dict[str, int]:
    """Idempotently seeds standard curriculum chapters and topics for existing subjects."""
    seeded_counts = {"chapters": 0, "topics": 0}
    subjects = db.execute(select(Subject)).scalars().all()

    for subj in subjects:
        # Match subject name loosely (e.g. "Mathematics", "General Science")
        matched_key = None
        for key in STANDARD_CURRICULUM:
            if key.lower() in subj.name.lower() or subj.name.lower() in key.lower():
                matched_key = key
                break

        if not matched_key:
            continue

        chapters_spec = STANDARD_CURRICULUM[matched_key]
        for ch_spec in chapters_spec:
            # Check if chapter already exists for this subject
            existing_ch = db.execute(
                select(SubjectChapter).where(
                    SubjectChapter.subject_id == subj.id,
                    SubjectChapter.chapter_number == ch_spec["chapter_number"]
                )
            ).scalars().first()

            if not existing_ch:
                existing_ch = SubjectChapter(
                    subject_id=subj.id,
                    chapter_number=ch_spec["chapter_number"],
                    title=ch_spec["title"],
                    description=ch_spec["description"],
                    order_index=ch_spec["chapter_number"],
                )
                db.add(existing_ch)
                db.flush()
                seeded_counts["chapters"] += 1

            # Seed topics
            for idx, top_spec in enumerate(ch_spec["topics"], start=1):
                existing_top = db.execute(
                    select(ChapterTopic).where(
                        ChapterTopic.chapter_id == existing_ch.id,
                        ChapterTopic.title == top_spec["title"]
                    )
                ).scalars().first()

                if not existing_top:
                    new_top = ChapterTopic(
                        chapter_id=existing_ch.id,
                        title=top_spec["title"],
                        learning_objective=top_spec["objective"],
                        difficulty_level=top_spec["difficulty"],
                        estimated_minutes=top_spec["minutes"],
                        order_index=idx,
                    )
                    db.add(new_top)
                    seeded_counts["topics"] += 1

    db.commit()
    logger.info(f"Seeded curriculum: {seeded_counts['chapters']} chapters, {seeded_counts['topics']} topics.")
    return seeded_counts
