const passport = require('passport');
const Student = require('../models/Student');
const Professor = require('../models/Professor');
const GoogleStrategy = require( 'passport-google-oauth20' ).Strategy;
const dotenv = require('dotenv');

// Determine branch based on branch code

dotenv.config()



passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/google/callback",
  },
  async (accessToken, refreshToken, profile, done) => {
    console.log('Profile : ', profile)
    const email = profile.emails[0].value; // This is correct based on the provided profile format
    const isStudent = /^\d{2}[a-zA-Z]{3}\d{3}@iiitdwd\.ac\.in$/.test(email)
    const joiningYear = parseInt(email.slice(0, 2), 10);
    const currentYear = new Date().getFullYear() % 100; // Get last two digits of current year
    const rollNumber = email.split('@')[0];
    const branchCode = rollNumber.slice(2, 5).toUpperCase();


    let sem;
    if (joiningYear === currentYear) {
        sem = 1;
    } else if (joiningYear === currentYear - 1) { 
        sem = 3;
    } else if (joiningYear === currentYear - 2) {
        sem = 5;
    } else if (joiningYear === currentYear - 3) {
        sem = 7;
    } else {
        sem = 1; // Default to 1 if out of range
    }

    let branch;
    if (branchCode === 'BCS') {
        branch = 'CSE';
    } else if (branchCode === 'BDS') {
        branch = 'DSAI';
    } else if (branchCode === 'BEC') {
        branch = 'ECE';
    } else {
        branch = 'Unknown'; // Default value if branch code does not match
    }
    
    
    try {
        if(isStudent){
            let student = await Student.findOne({email})
            if(!student){
                student = await Student.create({
                    name: profile.name.givenName,
                    email: email,
                    rollNo: rollNumber,
                    phone: '9515495154',
                    semester: sem,
                    branch: branch,

                })

            }
            done(null, student)
        } else {
            let professor = await Professor.findOne({ email });
            if (!professor) {
                professor = await Professor.create({
                    name: profile.displayName,
                    email,
                    department: 'CSE',  // Placeholder
                    phone: '7894561230'       // Placeholder
                });
            }
            done(null, professor);
        }
    } catch (error) {
        done(error, null)
    }
  }
));

// Serialize and deserialize user for session support
passport.serializeUser((user, done) => {
    done(null, { id: user._id, role: user instanceof Student ? 'student' : 'professor' });
});

// Deserialize user for session support
passport.deserializeUser(async (user, done) => {
    const Model = user.role === 'student' ? Student : Professor;
    try {
        const foundUser = await Model.findById(user.id);
        done(null, foundUser);
    } catch (err) {
        done(err, null);
    }
});
