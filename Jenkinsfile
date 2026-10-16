pipeline {
    // Requirement: Pinned Docker agent, not 'latest'
    agent {
        docker {
            image 'node:18'
            args '-e HOME=/tmp -e npm_config_cache=/tmp/.npm -v /var/lib/jenkins/npm-cache:/tmp/.npm'
        }
    }

    parameters {
        // Fault-injection hook used for the fault-injection log. Leave as 'none' for normal runs.
        choice(name: 'FAULT', choices: ['none', 'lint', 'build', 'test', 'audit', 'archive', 'publish'], description: 'Deliberately break one stage to prove the pipeline fails safely')
    }

    environment {
        // Requirement: Use VM IP, NOT localhost, to avoid Docker network isolation issues
        NEXUS_HOST          = '192.168.0.106:8081'
        NEXUS_REPO          = "${params.FAULT == 'publish' ? 'wrong-repo' : 'kijaniokiosk-npm'}"
        NEXUS_CREDENTIAL_ID = 'nexus-creds'
    }

    stages {
        stage('Set Version') {
            steps {
                script {
                    // Requirement: Semantic versioning + Git SHA for unique artifacts
                    env.GIT_SHA = env.GIT_COMMIT.take(7)
                    env.VERSION = "1.0.0-${env.GIT_SHA}"
                    echo "Building version: ${env.VERSION}"
                    echo "Fault injection setting: ${params.FAULT}"
                }
            }
        }

        stage('Lint') {
            steps {
                echo 'Running Lint stage...'
                sh 'npm install'
                // Requirement: Lint runs BEFORE Build (fail-fast)
                sh 'npm run lint'
                script {
                    if (params.FAULT == 'lint') {
                        echo 'FAULT INJECTED: syntax error in lint stage'
                        sh 'echo "var x = ;" > bad.js && npx eslint bad.js'
                    }
                }
            }
        }

        stage('Build') {
            steps {
                echo 'Running Build stage...'
                sh 'npm run build'
                script {
                    if (params.FAULT == 'build') {
                        echo 'FAULT INJECTED: build failure'
                        sh 'exit 1'
                    }
                }
            }
        }

        stage('Verify') {
            // Requirement: Parallel execution for Test and Security Audit
            parallel {
                stage('Test') {
                    steps {
                        echo 'Running Tests...'
                        sh 'npm test'
                        script {
                            if (params.FAULT == 'test') {
                                echo 'FAULT INJECTED: test failure'
                                sh 'exit 1'
                            }
                        }
                    }
                }
                stage('Security Audit') {
                    steps {
                        echo 'Running Security Audit...'
                        script {
                            if (params.FAULT == 'audit') {
                                echo 'FAULT INJECTED: installing a known vulnerable package'
                                sh 'npm install minimist@0.0.8'
                            }
                        }
                        // Allow audit to fail the build if high vulnerabilities are found
                        sh 'npm audit --audit-level=high'
                    }
                }
            }
        }

        stage('Archive') {
            steps {
                echo 'Archiving build artifacts...'
                script {
                    def folder = (params.FAULT == 'archive') ? 'missing-folder/' : 'dist/'
                    if (params.FAULT == 'archive') {
                        echo 'FAULT INJECTED: archiving a folder that does not exist'
                    }
                    sh "tar -czf kijaniokiosk-payments-${VERSION}.tar.gz ${folder} package.json"
                }
                archiveArtifacts artifacts: "kijaniokiosk-payments-${VERSION}.tar.gz", fingerprint: true
            }
        }

        stage('Publish') {
            steps {
                echo "Publishing to Nexus repository: ${NEXUS_REPO}"
                // Requirement: withCredentials using ID only, no hardcoded secrets
                withCredentials([usernamePassword(credentialsId: "${NEXUS_CREDENTIAL_ID}",
                                                  usernameVariable: 'NEXUS_USER',
                                                  passwordVariable: 'NEXUS_PASS')]) {
                    // Requirement: .npmrc created and deleted in the SAME sh block
                    sh '''
                        trap 'rm -f .npmrc' EXIT

                        npm version "$VERSION" --no-git-tag-version --allow-same-version

                        AUTH=$(printf '%s:%s' "$NEXUS_USER" "$NEXUS_PASS" | base64 | tr -d '\\n')
                        echo "//${NEXUS_HOST}/repository/${NEXUS_REPO}/:_auth=${AUTH}" > .npmrc
                        echo "//${NEXUS_HOST}/repository/${NEXUS_REPO}/:always-auth=true" >> .npmrc

                        npm publish --registry "http://${NEXUS_HOST}/repository/${NEXUS_REPO}/"

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
            echo "Nexus URL: http://${NEXUS_HOST}/repository/${NEXUS_REPO}/kijaniokiosk-payments/-/kijaniokiosk-payments-${VERSION}.tgz"
        }
        failure {
            echo "FAILURE: Pipeline failed. Check the red stage in Stage View."
            // In a real scenario, you would add Slack/Email notification here
        }
        changed {
            echo "CHANGED: Build status changed, now ${currentBuild.currentResult}"
        }
    }
}
