pipeline {
    // Requirement: Pinned Docker agent, not 'latest'
    agent {
        docker {
            image 'node:18-alpine'
        }
    }

    environment {
        // Requirement: Use VM IP, NOT localhost, to avoid Docker network isolation issues
        NEXUS_URL = 'http://192.168.0.106:8081'
        NEXUS_REPO = 'kijaniokiosk-npm'
        NEXUS_CREDENTIAL_ID = 'nexus-creds'
        
        // Requirement: Semantic versioning + Git SHA for unique artifacts
        GIT_SHA = sh(script: 'git rev-parse --short HEAD', returnStdout: true).trim()
        SEMVER = '1.0.0'
        VERSION = "${SEMVER}-${GIT_SHA}"
    }

    stages {
        stage('Lint') {
            steps {
                echo 'Running Lint stage...'
                sh 'npm install'
                // Requirement: Lint runs BEFORE Build (fail-fast)
                sh 'npm run lint'
            }
        }

        stage('Build') {
            steps {
                echo 'Running Build stage...'
                sh 'npm run build'
            }
        }

        stage('Verify') {
            // Requirement: Parallel execution for Test and Security Audit
            parallel {
                stage('Test') {
                    steps {
                        echo 'Running Tests...'
                        sh 'npm test'
                    }
                }
                stage('Security Audit') {
                    steps {
                        echo 'Running Security Audit...'
                        // Allow audit to fail the build if high vulnerabilities are found
                        sh 'npm audit --audit-level=high'
                    }
                }
            }
        }

        stage('Archive') {
            steps {
                echo 'Archiving build artifacts...'
                sh "tar -czf kijaniokiosk-payments-${VERSION}.tar.gz dist/ package.json"
                archiveArtifacts artifacts: "kijaniokiosk-payments-${VERSION}.tar.gz", fingerprint: true
            }
        }

        stage('Publish') {
            steps {
                echo 'Publishing to Nexus...'
                // Requirement: withCredentials using ID only, no hardcoded secrets
                withCredentials([usernamePassword(credentialsId: "${NEXUS_CREDENTIAL_ID}", usernameVariable: 'NEXUS_USER', passwordVariable: 'NEXUS_PASS')]) {
                    // Requirement: .npmrc created and deleted in the SAME sh block
                    sh '''
                        echo "//${NEXUS_URL}/repository/${NEXUS_REPO}/:_auth=$(echo -n ${NEXUS_USER}:${NEXUS_PASS} | base64)" > .npmrc
                        echo "//${NEXUS_URL}/repository/${NEXUS_REPO}/:always-auth=true" >> .npmrc
                        
                        # Publish the package
                        npm publish --registry ${NEXUS_URL}/repository/${NEXUS_REPO}/
                        
                        # Clean up immediately to prevent credential leakage
                        rm -f .npmrc
                    '''
                }
            }
        }
    }

    // Requirement: Post block with always, success, failure, changed
    post {
        always {
            echo 'Cleaning up workspace...'
            // Requirement: cleanWs() in post always
            cleanWs()
        }
        success {
            echo "SUCCESS: Artifact published successfully."
            echo "Nexus URL: ${NEXUS_URL}/repository/${NEXUS_REPO}/kijaniokiosk-payments/-/kijaniokiosk-payments-${VERSION}.tgz"
        }
        failure {
            echo "FAILURE: Pipeline failed at stage: ${currentBuild.currentResult}"
            // In a real scenario, you would add Slack/Email notification here
        }
        changed {
            echo "CHANGED: Build status changed from ${currentBuild.previousResult} to ${currentBuild.currentResult}"
        }
    }
}
