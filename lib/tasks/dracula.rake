namespace :dracula do
  namespace :db do
    desc 'Set up your database tables'
    task :auto_upgrade => :environment do
      DataMapper::AutoMigrator.auto_upgrade
    end
    
  end
end