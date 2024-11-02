const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const session = require('express-session');
const passport = require('passport');
const Student = require('./models/Student');
const Professor = require('./models/Professor');
const Course = require('./models/Course');
const seedCourses = require('./seedCourses');

seedCourses();

require('./config/passport');

dotenv.config();
const PORT = process.env.PORT || 3000;

const app = express();

app.use(express.json());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.set('views', './views');

app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
}));

// Initialize Passport and session handling
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch((error) => console.error('Failed to connect to MongoDB:', error));

app.get('/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
}));

app.get('/google/callback', passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        // Redirect based on user role after successful login
        if (req.user instanceof Student) {
            res.redirect('/student/home');
        } else {
            res.redirect('/professor/home');
        }
    }
);

app.get('/', (req, res) => {
    res.render('landing');
});

// Route to render student home
app.get('/student/home', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');

    try {
        // Fetch the logged-in user (student)
        const student = await Student.findById(req.user._id).populate('enrolledCourses');

        // Render the home page with the student data and available courses
        res.render('student/home', {
            user: student,
            availableCourses: await Course.find() // Fetch all available courses
        });
    } catch (error) {
        console.error("Error fetching student data:", error);
        return res.status(500).send("Internal Server Error");
    }
});

app.get('/professor/home', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');

    try {
        // Fetch the professor's courses
        const professorCourses = await Course.find({ professorId: req.user._id });
        res.render('professor/home', { user: req.user, courses: professorCourses });
    } catch (error) {
        console.error("Error fetching professor's courses:", error);
        res.status(500).send("Internal Server Error");
    }
});

app.get('/student/course/:id', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');

    try {
        const course = await Course.findById(req.params.id).populate('professor');
        
        if (!course) return res.status(404).send("Course not found");

        // Send course details as JSON
        res.json(course);
    } catch (error) {
        console.error("Error fetching course details:", error);
        return res.status(500).send("Internal Server Error");
    }
});

// Add this route for enrollment
app.post('/student/enroll/:courseId', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');

    try {
        const courseId = req.params.courseId;
        const studentId = req.user._id; // Get the logged-in student's ID

        // Find the course by ID
        const course = await Course.findById(courseId);
        if (!course) return res.status(404).send("Course not found");

        // Check if the student is already enrolled
        if (course.enrolledStudents.includes(studentId)) {
            return res.status(400).send("Already enrolled in this course");
        }

        // Enroll the student
        course.enrolledStudents.push(studentId);
        await course.save();

        // Update the student's enrolled courses
        const student = await Student.findById(studentId);
        student.enrolledCourses.push(courseId);
        await student.save();

        // Redirect back to the student home page
        res.redirect('/student/home');
    } catch (error) {
        console.error("Error enrolling in course:", error);
        return res.status(500).send("Internal Server Error");
    }
});

app.get('/student/checkout', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');

    const cart = req.session.cart || [];
    
    console.log("Cart contents:", cart); // Log the cart contents
    
    // Fetch the course details for the courses in the cart
    const coursesInCart = await Promise.all(cart.map(courseId => Course.findById(courseId).exec()));
    
    console.log("Courses in cart:", coursesInCart); // Log the courses fetched
    
    res.render('student/checkout', {
        cart: coursesInCart // Pass the course details to the view
    });
});

app.post('/student/addToCart', (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).send("Unauthorized");

    const courseId = req.body.courseId; // Get the course ID from the request body

    // Check if courseId is valid
    if (!courseId) {
        return res.status(400).send("Course ID is required");
    }

    // Initialize the cart if it doesn't exist
    if (!req.session.cart) {
        req.session.cart = [];
    }

    // Add the course ID to the cart if it's not already in there
    if (!req.session.cart.includes(courseId)) {
        req.session.cart.push(courseId);
    }

    res.status(200).send("Course added to cart");
});

// Route to confirm enrollment
app.post('/student/confirm', async (req, res) => {
    if (!req.isAuthenticated()) return res.redirect('/');

    const userId = req.user._id; // Get the current user's ID
    const userCart = req.session.cart || []; // Get the user's cart or an empty array

    try {
        // Find the user in the database and update their enrolled courses
        const user = await Student.findById(userId);
        if (!user) {
            return res.status(404).send("User not found.");
        }

        // Enroll the user in each course in the cart
        const enrollPromises = userCart.map(async courseId => {
            const course = await Course.findById(courseId);
            if (course) {
                user.enrolledCourses.push(courseId); // Add the course ID to enrolled courses
                course.enrolledStudents.push(userId); // Update course enrollment
                await course.save(); // Save the updated course document
            }
        });

        await Promise.all(enrollPromises);
        await user.save(); // Save the updated user document

        // Clear the cart after enrollment
        delete req.session.cart; // Clear the cart from the session
        res.redirect('/student/home'); // Redirect to the home page or a success page
    } catch (error) {
        console.error("Error confirming enrollment:", error);
        res.status(500).send("An error occurred during enrollment.");
    }
});

app.listen(PORT, () => {
    console.log(`Server is listening on PORT: ${PORT}`);
});
